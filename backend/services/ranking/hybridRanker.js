import { Worker }            from 'worker_threads';
import { fileURLToPath }     from 'url';
import { dirname, join }     from 'path';
import { rankByKeywords }    from './keywordRanker.js';
import { recencyBonus, citationScore } from '../../utils/scorer.js';
import { TOP_K_PUBLICATIONS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BM25_WORKER_PATH = join(__dirname, '../../workers/bm25Worker.js');

function rankByKeywordsAsync(publications, query) {
  return new Promise((resolve) => {
    try {

      const slim = publications.map(({ title, abstract, _id, url, doi }) =>
        ({ title, abstract, _id, url, doi }),
      );

      const worker = new Worker(BM25_WORKER_PATH, {
        workerData: { publications: slim, query },
      });

      worker.on('message', ({ publications: scored, error }) => {
        if (error) {
          resolve(rankByKeywords(publications, query));
          return;
        }

        const merged = publications.map((pub, i) => ({
          ...pub,
          keywordScore: scored[i]?.keywordScore ?? 0,
        }));
        resolve(merged);
      });
      worker.on('error', () => resolve(rankByKeywords(publications, query)));
    } catch {
      resolve(rankByKeywords(publications, query));
    }
  });
}

const CROSS_ENCODER_CANDIDATE_LIMIT = 15;

const RRF_K = 60;

const EMBEDDING_CANDIDATE_LIMIT = 150;

function reciprocalRankFusion(bm25Ranks, embedRanks) {
  const scores = new Map();
  const addScore = (id, rank) => {
    scores.set(id, (scores.get(id) || 0) + 1 / (RRF_K + rank));
  };
  bm25Ranks.forEach((rank, id) => addScore(id, rank));
  embedRanks.forEach((rank, id) => addScore(id, rank));
  return scores;
}

function mmrDiversify(ranked, lambda = 0.7, topK = TOP_K_PUBLICATIONS) {
  if (ranked.length <= topK) return ranked;

  const selected  = [ranked[0]];
  const remaining = ranked.slice(1);

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx   = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].finalScore ?? 0;

      const maxSimilarity = Math.max(...selected.map((s) => {

        const ceA = remaining[i].crossEncoderScore;
        const ceB = s.crossEncoderScore;
        if (ceA != null && ceB != null) {

          return Math.exp(-Math.abs(ceA - ceB) * 0.3);
        }

        const vecA = remaining[i].embeddingVector;
        const vecB = s.embeddingVector;
        if (vecA && vecB && vecA.length === vecB.length) {
          let dot = 0, nA = 0, nB = 0;
          for (let j = 0; j < vecA.length; j++) {
            dot += vecA[j] * vecB[j];
            nA  += vecA[j] * vecA[j];
            nB  += vecB[j] * vecB[j];
          }
          return nA && nB ? dot / (Math.sqrt(nA) * Math.sqrt(nB)) : 0;
        }

        const tA = (remaining[i].title || '').toLowerCase().split(/\W+/);
        const tB = (s.title || '').toLowerCase().split(/\W+/);
        const hit = tA.filter((t) => tB.includes(t) && t.length > 3);
        return hit.length / Math.max(tA.length, tB.length, 1);
      }));

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx   = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

function topicRelevanceFilter(publications, query, disease = '') {
  const MIN_AFTER_FILTER = 30;
  const STOP = new Set(['with','from','that','this','have','been','were','they','their',
    'also','more','than','into','which','what','when','where','about','some','will']);

  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));

  const diseaseTerms = disease
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  if (queryTerms.length === 0) return publications;

  const scored = publications.map((pub) => {
    const text = `${pub.title || ''} ${(pub.abstract || '').slice(0, 400)}`.toLowerCase();
    const matches = queryTerms.filter((t) => text.includes(t)).length;
    const titleText = (pub.title || '').toLowerCase();

    const titleHit  = queryTerms.filter((t) => titleText.includes(t)).length >= 2;

    const diseaseHit = diseaseTerms.length === 0 || diseaseTerms.some((t) => text.includes(t));
    return { pub, matches, titleHit, diseaseHit };
  });

  const minMatches = queryTerms.length >= 4 ? 3 : 2;

  const relevant = scored
    .filter((s) => s.diseaseHit && (s.matches >= minMatches || (s.matches >= 1 && s.titleHit)))
    .map((s) => s.pub);

  return relevant.length >= MIN_AFTER_FILTER ? relevant : publications;
}

const USE_ONNX = process.env.USE_ONNX !== 'false';

export async function rankPublications(publications, query, disease = '') {
  if (!publications || publications.length === 0) return [];

  const filtered = topicRelevanceFilter(publications, query, disease);
  if (filtered.length < publications.length) {
    logger.debug(`[HybridRanker] Topic filter: ${publications.length} → ${filtered.length} papers`);
  }

  const pubsWithBM25 = await rankByKeywordsAsync(filtered, query);
  const bm25Sorted = [...pubsWithBM25].sort((a, b) => (b.keywordScore || 0) - (a.keywordScore || 0));

  const sourceCredibility = (pub) => {
    if (pub.source === 'PubMed') return 1.0;
    if (pub.source === 'OpenAlex') {
      const journal = (pub.journal || '').toLowerCase();
      if (/biorxiv|medrxiv|arxiv|preprint/i.test(journal)) return 0.6;
      return 0.85;
    }
    return 0.75;
  };

  if (USE_ONNX) {
    // Full pipeline: BM25 → MiniLM embeddings → RRF → cross-encoder → MMR
    const { rankByEmbeddings }   = await import('./embeddingRanker.js');
    const { crossEncoderRerank } = await import('./crossEncoderReranker.js');

    const bm25Ranks = new Map(bm25Sorted.map((p, idx) => [p._id || p.url || p.title, idx + 1]));

    const embeddingCandidates = bm25Sorted.slice(0, EMBEDDING_CANDIDATE_LIMIT);
    const pubsWithEmbeddings  = await rankByEmbeddings(embeddingCandidates, query);
    const embedSorted = [...pubsWithEmbeddings].sort((a, b) => (b.embeddingScore || 0) - (a.embeddingScore || 0));
    const embedRanks  = new Map(embedSorted.map((p, idx) => [p._id || p.url || p.title, idx + 1]));

    const rrfScores = reciprocalRankFusion(bm25Ranks, embedRanks);

    for (const pub of pubsWithEmbeddings) {
      const id = pub._id || pub.url || pub.title;
      pub.finalScore = Math.min(
        ((rrfScores.get(id) || 0) * 100 + recencyBonus(pub.year) + citationScore(pub.citationCount || 0))
          * sourceCredibility(pub),
        1.0,
      );
    }
    for (const pub of bm25Sorted.slice(EMBEDDING_CANDIDATE_LIMIT)) {
      const id = pub._id || pub.url || pub.title;
      pub.finalScore = Math.min(
        ((rrfScores.get(id) || 1 / (RRF_K + EMBEDDING_CANDIDATE_LIMIT + 1)) * 100
          + recencyBonus(pub.year) + citationScore(pub.citationCount || 0))
          * sourceCredibility(pub),
        1.0,
      );
    }

    const allScored = [...pubsWithEmbeddings, ...bm25Sorted.slice(EMBEDDING_CANDIDATE_LIMIT)];
    allScored.sort((a, b) => b.finalScore - a.finalScore);

    const reranked = await crossEncoderRerank(query, allScored.slice(0, CROSS_ENCODER_CANDIDATE_LIMIT));
    logger.debug(`[HybridRanker] full pipeline ceTop="${reranked[0]?.title?.slice(0,60)}"`);
    return mmrDiversify([...reranked, ...allScored.slice(CROSS_ENCODER_CANDIDATE_LIMIT)], 0.7, TOP_K_PUBLICATIONS);
  }

  // Production lightweight pipeline: BM25 + recency + citation scoring only
  logger.debug('[HybridRanker] Production mode — BM25 + recency/citation scoring (no ONNX)');
  for (const pub of bm25Sorted) {
    pub.finalScore = Math.min(
      ((pub.keywordScore || 0) + recencyBonus(pub.year) + citationScore(pub.citationCount || 0))
        * sourceCredibility(pub),
      1.0,
    );
  }
  bm25Sorted.sort((a, b) => b.finalScore - a.finalScore);
  return mmrDiversify(bm25Sorted, 0.7, TOP_K_PUBLICATIONS);
}
