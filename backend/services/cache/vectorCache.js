import { Pinecone } from '@pinecone-database/pinecone';
import logger from '../../utils/logger.js';

const INDEX_NAME = process.env.PINECONE_INDEX ?? 'curalink-queries';
const SIMILARITY_THRESHOLD = 0.90;

let _index = null;

async function getIndex() {
  if (!process.env.PINECONE_API_KEY) return null;
  if (_index) return _index;
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    _index = pc.index(INDEX_NAME);
    logger.info('[VectorCache] Pinecone connected');
    return _index;
  } catch (err) {
    logger.warn(`[VectorCache] Pinecone init failed: ${err.message}`);
    return null;
  }
}

export async function embedQueryText(text) {
  try {
    const { getEmbedder } = await import('../embeddings/embedder.js');
    const embedder = await getEmbedder();
    if (!embedder) return null;
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    const vec = Array.from(output.data);
    if (!vec || vec.length === 0) return null;
    logger.info(`[VectorCache] Embedded query — dim: ${vec.length}`);
    return vec;
  } catch (err) {
    logger.warn(`[VectorCache] Embed error: ${err.message}`);
    return null;
  }
}

export async function searchVectorCache(embedding, disease) {
  const index = await getIndex();
  if (!index || !embedding) return null;

  try {
    const results = await index.query({
      vector: embedding,
      topK: 1,
      filter: { disease: { $eq: disease.toLowerCase().trim() } },
      includeMetadata: true,
    });

    const match = results.matches?.[0];
    if (!match || match.score < SIMILARITY_THRESHOLD) return null;

    logger.info(`[VectorCache] Cache HIT (score: ${match.score.toFixed(3)}) for "${disease}"`);

    const raw = match.metadata?.result;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`[VectorCache] Search error: ${err.message}`);
    return null;
  }
}

export async function storeVectorCache(embedding, disease, userQuery, result) {
  const index = await getIndex();
  if (!index || !embedding || !Array.isArray(embedding) || embedding.length === 0) return;

  try {
    const slim = {
      conditionOverview:    result.conditionOverview,
      keyFindings:          result.keyFindings,
      treatmentAnalysis:    result.treatmentAnalysis,
      outcomesSummary:      result.outcomesSummary,
      clinicalTrialsSummary: result.clinicalTrialsSummary,
      recommendation:       result.recommendation,
      evidenceGrade:        result.evidenceGrade,
      contradictions:       result.contradictions,
      limitations:          result.limitations,
      publications:         result.publications?.slice(0, 8).map((p) => ({
        title: p.title, authors: p.authors, year: p.year, abstract: (p.abstract || '').slice(0, 200),
        url: p.url, source: p.source, studyType: p.studyType, citationCount: p.citationCount,
        finalScore: p.finalScore,
      })),
      trials: result.trials?.slice(0, 8).map((t) => ({
        title: t.title, status: t.status, phase: t.phase, url: t.url,
        eligibility: (t.eligibility || '').slice(0, 150), location: t.location,
      })),
      confidence_score: result.confidence_score,
      provider: result.provider,
    };

    const resultStr = JSON.stringify(slim);
    if (resultStr.length > 38_000) {
      logger.warn('[VectorCache] Result too large to cache, skipping');
      return;
    }

    logger.info(`[VectorCache] Upserting vector dim=${embedding.length}, size=${resultStr.length} bytes`);
    const id = `${disease}-${Date.now()}`.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 512);

    await index.upsert([{
      id,
      values: embedding,
      metadata: {
        disease:  disease.toLowerCase().trim(),
        query:    userQuery.slice(0, 200),
        result:   resultStr,
        cachedAt: new Date().toISOString(),
      },
    }]);

    logger.info(`[VectorCache] Stored result for "${disease}" (${resultStr.length} bytes)`);
  } catch (err) {
    logger.warn(`[VectorCache] Store error: ${err.message}`);
  }
}
