import axios from 'axios';
import axiosRetry from 'axios-retry';
import { normalizeTrial } from '../../utils/normalizer.js';
import logger from '../../utils/logger.js';
import { TRIALS_FETCH_LIMIT, API_RETRY_ATTEMPTS, API_RETRY_DELAY_MS } from '../../config/constants.js';

const ctAxios = axios.create({
  baseURL: 'https://clinicaltrials.gov/api/v2/studies',
  timeout: 20_000,
});

axiosRetry(ctAxios, {
  retries:        API_RETRY_ATTEMPTS,
  retryDelay:     (count) => count * API_RETRY_DELAY_MS,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response?.status >= 500),
  onRetry: (count, err) => logger.warn(`ClinicalTrials retry #${count}: ${err.message}`),
});

const STATUSES = ['RECRUITING', 'ACTIVE_NOT_RECRUITING', 'COMPLETED'];

function sanitizeDisease(disease) {
  return disease
    .replace(/[''`]/g, '')
    .replace(/[?!()[\]{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 200);
}

function extractLocationParts(location) {
  if (!location) return { country: null, city: null };
  const parts = location.split(',').map((p) => p.trim());

  if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
  return { city: null, country: parts[0] };
}

export async function fetchClinicalTrials(disease, limit = TRIALS_FETCH_LIMIT, location = null) {
  const safeDisease = sanitizeDisease(disease);
  const { country, city } = extractLocationParts(location);

  try {
    const fetchStatus = async (status) => {
      try {
        const params = {
          'query.cond':           safeDisease,
          'filter.overallStatus': status,
          pageSize:               25,
          format:                 'json',
        };
        if (country) params['query.locn'] = country;

        const res = await ctAxios.get('', { params });
        const page1 = res.data?.studies ?? [];

        const nextToken = res.data?.nextPageToken;
        if (nextToken && page1.length === 25) {
          try {
            const res2 = await ctAxios.get('', { params: { ...params, pageToken: nextToken } });
            return [...page1, ...(res2.data?.studies ?? [])];
          } catch {
            return page1;
          }
        }
        return page1;
      } catch (err) {
        logger.warn(`ClinicalTrials (${status}) error: ${err.message}`);
        return [];
      }
    };

    let results = await Promise.all(STATUSES.map(fetchStatus));
    let allTrials = results.flat();

    if (country && allTrials.length < 3) {
      logger.info(`ClinicalTrials: sparse location results (${allTrials.length}), adding global fallback`);
      const globalFetch = async (status) => {
        try {
          const res = await ctAxios.get('', {
            params: {
              'query.cond': safeDisease,
              'filter.overallStatus': status,
              pageSize: 15,
              format: 'json',
            },
          });
          return res.data?.studies ?? [];
        } catch { return []; }
      };
      const globalResults = await Promise.all(STATUSES.map(globalFetch));
      allTrials = [...allTrials, ...globalResults.flat()];
    }

    const seenIds = new Set();
    const unique = allTrials.filter((t) => {
      const id = t.protocolSection?.identificationModule?.nctId;
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const interventionalOnly = unique.filter((t) => {
      const studyType = t.protocolSection?.designModule?.studyType ?? '';
      return studyType === '' || studyType === 'INTERVENTIONAL';
    });
    const forNormalization = interventionalOnly.length >= 2 ? interventionalOnly : unique;

    const diseaseTerms = safeDisease.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);

    const normalized = forNormalization
      .map((t) => normalizeTrial(t, location))
      .filter((t) => {
        if (!t.title || t.title === 'Untitled Trial' || !t.eligibility) return false;
        if (diseaseTerms.length === 0) return true;
        const text = `${t.title} ${t.eligibility}`.toLowerCase();
        return diseaseTerms.some((term) => text.includes(term));
      });

    if (country) {
      normalized.sort((a, b) => {
        const aHasLocation = (a.location || '').toLowerCase().includes(country.toLowerCase());
        const bHasLocation = (b.location || '').toLowerCase().includes(country.toLowerCase());
        return (bHasLocation ? 1 : 0) - (aHasLocation ? 1 : 0);
      });
    }

    logger.debug(`ClinicalTrials: fetched ${normalized.length} trials for "${disease}" (location: ${location || 'global'})`);
    return normalized.slice(0, limit);
  } catch (err) {
    logger.error(`ClinicalTrials total fetch error for "${disease}": ${err.message}`);
    return [];
  }
}
