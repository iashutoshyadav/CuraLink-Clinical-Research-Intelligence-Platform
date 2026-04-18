import axios from 'axios';
import axiosRetry from 'axios-retry';
import { parsePubMedArticles } from '../../utils/xmlParser.js';
import logger from '../../utils/logger.js';
import { FETCH_LIMIT, API_RETRY_ATTEMPTS, API_RETRY_DELAY_MS } from '../../config/constants.js';

const pubmedAxios = axios.create({ timeout: 20_000 });

axiosRetry(pubmedAxios, {
  retries:        API_RETRY_ATTEMPTS,
  retryDelay:     (count) => count * API_RETRY_DELAY_MS,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response?.status >= 500),
  onRetry: (count, err) => logger.warn(`PubMed retry #${count}: ${err.message}`),
});

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL  = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const API_KEY     = process.env.PUBMED_API_KEY ?? '';

export async function fetchPubMed(query, limit = FETCH_LIMIT, fromDate = null) {
  try {
    const searchParams = {
      db:      'pubmed',
      term:    query,
      retmax:  Math.min(limit, 200),
      sort:    'pub+date',
      retmode: 'json',
      ...(API_KEY && { api_key: API_KEY }),

      ...(fromDate && { mindate: fromDate.replace(/-/g, '/'), datetype: 'pdat' }),
    };

    const searchRes = await pubmedAxios.get(ESEARCH_URL, { params: searchParams });
    const ids = searchRes.data?.esearchresult?.idlist ?? [];

    if (!ids.length) {
      logger.debug(`PubMed: 0 results for "${query}"`);
      return [];
    }

    const articles  = [];

    const batchSize = 50;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch    = ids.slice(i, i + batchSize);
      const fetchRes = await pubmedAxios.get(EFETCH_URL, {
        params: { db: 'pubmed', id: batch.join(','), retmode: 'xml', ...(API_KEY && { api_key: API_KEY }) },
      });
      articles.push(...parsePubMedArticles(fetchRes.data));
    }

    logger.debug(`PubMed: fetched ${articles.length} articles for "${query}"`);
    return articles;
  } catch (err) {
    logger.error(`PubMed fetch error for "${query}": ${err.message}`);
    return [];
  }
}
