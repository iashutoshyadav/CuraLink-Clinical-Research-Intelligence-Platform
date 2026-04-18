import logger from '../../utils/logger.js';

const MIN_SENTENCE_CHARS = 40;

const TOP_SENTENCES_PER_PAPER = 3;

function splitIntoSentences(text) {
  if (!text || text.length < MIN_SENTENCE_CHARS) return [text].filter(Boolean);

  const protected_ = text
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|vs|Fig|et al|i\.e|e\.g)\./gi, '$1<DOT>')
    .replace(/(\d+)\./g, '$1<DOT>');

  const rawSentences = protected_.split(/(?<=[.!?])\s+(?=[A-Z])/);

  return rawSentences
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length >= MIN_SENTENCE_CHARS);
}

function scoreSentence(sentence, queryTerms) {
  if (!queryTerms.length) return 0;

  const sentWords = sentence.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (!sentWords.length) return 0;

  const matchedTerms = queryTerms.filter((t) => sentWords.includes(t));

  const weightedScore = matchedTerms.reduce((sum, t) => sum + t.length, 0);
  const maxPossible   = queryTerms.reduce((sum, t) => sum + t.length, 0);

  return maxPossible > 0 ? weightedScore / maxPossible : 0;
}

const STOPWORDS = new Set([
  'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
  'were', 'they', 'their', 'there', 'which', 'when', 'what', 'where',
  'also', 'than', 'more', 'some', 'such', 'into', 'used', 'well',
  'both', 'each', 'study', 'patients', 'results', 'methods', 'conclusion',
]);

export function extractPassages(publication, query, topK = TOP_SENTENCES_PER_PAPER) {
  const text = publication.abstract || publication.title || '';
  const sentences = splitIntoSentences(text);

  if (sentences.length <= topK) {

    return { ...publication, passages: sentences };
  }

  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  const scored = sentences.map((sentence, idx) => ({
    sentence,
    score: scoreSentence(sentence, queryTerms),
    idx,
  }));

  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score;
    return b.idx - a.idx;
  });

  const passages = scored.slice(0, topK).map((s) => s.sentence);

  return { ...publication, passages };
}

export function extractAllPassages(publications, query) {
  if (!publications?.length || !query) return publications;

  let totalSentences = 0;
  const result = publications.map((pub) => {
    const enriched = extractPassages(pub, query);
    totalSentences += enriched.passages?.length ?? 0;
    return enriched;
  });

  logger.debug(`[PassageExtractor] Extracted ${totalSentences} passages from ${publications.length} publications`);
  return result;
}
