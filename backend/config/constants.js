export const FETCH_LIMIT = 150;
export const MAX_UNIQUE_PAPERS = 180;
export const TRIALS_FETCH_LIMIT = 50;
export const TOP_K_PUBLICATIONS = 8;
export const TOP_K_TRIALS = 6;
export const QUERY_VARIANTS = 2;
export const RANKING_WEIGHTS = {
  keyword: 0.40,
  embedding: 0.60,
};

export const RECENCY_BONUS = {
  after2023: 0.20,
  after2021: 0.10,
  after2019: 0.05,
};
export const CACHE_TTL_SECONDS = 86400;
export const LLM_TIMEOUT_MS = 8_000;
export const MAX_CONTEXT_TOKENS = 2_048;
export const GROQ_MAX_INPUT_TOKENS = 7_500;
export const MAX_ABSTRACT_CHARS = 500;
export const EXPANSION_TIMEOUT_MS = 5_000;
export const API_CONCURRENCY_LIMIT = 5;
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY_MS = 1_000;
export const VALIDATION = {
  MIN_SOURCES: 2,
  MIN_CONFIDENCE: 0.40,
  MIN_PUBLICATIONS: 1,
};
