import axios from 'axios';
import axiosRetry from 'axios-retry';
import { normalizeOpenAlexWork } from '../../utils/normalizer.js';
import logger from '../../utils/logger.js';
import { FETCH_LIMIT, API_RETRY_ATTEMPTS, API_RETRY_DELAY_MS } from '../../config/constants.js';

const openAlexAxios = axios.create({
  baseURL: 'https://api.openalex.org',
  timeout: 5_000,
  headers: { 'User-Agent': 'Curalink/1.0 (medical-research-assistant)' },
});

axiosRetry(openAlexAxios, {
  retries:        1,
  retryDelay:     () => 500,
  retryCondition: (err) => err.response?.status >= 500,
  onRetry: (count, err) => logger.warn(`OpenAlex retry #${count}: ${err.message}`),
});

const PER_PAGE  = 50;
const MAX_PAGES = 4;

function sanitizeQuery(query) {
  return query
    .replace(/[''`]/g, '')
    .replace(/[?!()[\]{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 200);
}

const MIN_RESULTS_THRESHOLD = 30;

const DATE_FILTER_TIERS = [
  'from_publication_date:2020-01-01',
  'from_publication_date:2015-01-01',
  'from_publication_date:2010-01-01',
  null,
];

export async function fetchOpenAlex(query, limit = FETCH_LIMIT, fromDate = null) {
  const safeQuery = sanitizeQuery(query);

  const tiers = fromDate
    ? [`from_publication_date:${fromDate}`, ...DATE_FILTER_TIERS.filter((t) => t !== DATE_FILTER_TIERS[0])]
    : DATE_FILTER_TIERS;

  let networkErrorCount = 0;

  const fetchPage = async (page, sort, dateFilter) => {
    try {
      const params = {
        search:     safeQuery,
        'per-page': PER_PAGE,
        page,
        sort,

        mailto: process.env.OPENALEX_MAILTO ?? 'curalink@curalink.app',
        select: [
          'id', 'title', 'publication_year', 'publication_date',
          'abstract_inverted_index', 'authorships', 'primary_location',
          'doi', 'cited_by_count', 'type',
        ].join(','),
      };
      if (dateFilter) params.filter = dateFilter;

      const res = await openAlexAxios.get('/works', { params });
      return res.data?.results ?? [];
    } catch (err) {
      const status = err.response?.status ?? 'network';
      logger.warn(`OpenAlex page ${page} (${sort}) error [${status}]: ${err.message}`);

      if (!err.response) networkErrorCount++;
      return [];
    }
  };

  const maxPages = Math.min(Math.ceil(Math.min(limit, FETCH_LIMIT) / PER_PAGE), MAX_PAGES);
  const pageNums = Array.from({ length: maxPages }, (_, i) => i + 1);

  for (const dateFilter of tiers) {

    if (networkErrorCount >= 2) {
      logger.warn(`OpenAlex: circuit breaker tripped (${networkErrorCount} network errors) — skipping remaining tiers`);
      return [];
    }

    const allWorks = new Map();

    const [relevanceResults, recentResults] = await Promise.all([
      Promise.all(pageNums.map((p) => fetchPage(p, 'relevance_score:desc', dateFilter))),
      fetchPage(1, 'publication_date:desc', dateFilter),
    ]);

    relevanceResults.flat().forEach((w) => allWorks.set(w.id, w));
    recentResults.forEach((w) => allWorks.set(w.id, w));

    const normalized = [...allWorks.values()]
      .map(normalizeOpenAlexWork)
      .filter((p) => p.title && p.title !== 'Untitled');

    if (normalized.length >= MIN_RESULTS_THRESHOLD || dateFilter === null) {
      const label = dateFilter ?? 'no date filter';
      logger.debug(`OpenAlex: ${normalized.length} works for "${query}" (filter: ${label})`);
      return normalized.slice(0, limit);
    }

    logger.debug(`OpenAlex: only ${normalized.length} results with ${dateFilter} — widening date range`);
  }

  return [];
}
