import express from 'express';
import logger from '../utils/logger.js';
import { TEST_QUERIES } from '../eval/testQueries.js';
import { expandQuery } from '../services/query/queryExpander.js';
import { fetchPubMed } from '../services/fetchers/pubmedFetcher.js';
import { fetchOpenAlex } from '../services/fetchers/openAlexFetcher.js';
import { rankPublications } from '../services/ranking/hybridRanker.js';
import pLimit from 'p-limit';

const router = express.Router();

function computeMRR(rankedDOIs, relevantDOIs) {
  const relevant = new Set(relevantDOIs.map((d) => d.toLowerCase()));
  for (let i = 0; i < rankedDOIs.length; i++) {
    if (relevant.has((rankedDOIs[i] || '').toLowerCase())) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

function computeRecall(rankedDOIs, relevantDOIs, k = 8) {
  const topK = new Set(rankedDOIs.slice(0, k).map((d) => (d || '').toLowerCase()));
  const found = relevantDOIs.filter((doi) => topK.has(doi.toLowerCase())).length;
  return relevantDOIs.length > 0 ? found / relevantDOIs.length : 0;
}

async function runSingleEval(testCase) {
  const { disease, query, relevantDOIs } = testCase;

  try {

    const variants = await Promise.race([
      expandQuery(disease, query),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]).catch(() => [query]);

    const limit = pLimit(4);
    const fetchResults = await Promise.allSettled([
      ...variants.slice(0, 2).map((v) => limit(() => fetchPubMed(v))),
      ...variants.slice(0, 2).map((v) => limit(() => fetchOpenAlex(v))),
    ]);

    const papersMap = new Map();
    fetchResults.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        r.value.forEach((p) => {
          const key = p.doi
            ? `doi:${p.doi.toLowerCase().trim()}`
            : `title:${(p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          if (!papersMap.has(key)) papersMap.set(key, p);
        });
      }
    });

    const publications = Array.from(papersMap.values());
    if (publications.length === 0) {
      return { disease, query, mrr: 0, recall: 0, rankedCount: 0, error: 'No results' };
    }

    const ranked = await rankPublications(publications, query);
    const rankedDOIs = ranked.map((p) => p.doi ?? '');

    const mrr    = computeMRR(rankedDOIs, relevantDOIs);
    const recall = computeRecall(rankedDOIs, relevantDOIs, 8);

    return {
      disease,
      query,
      mrr:         parseFloat(mrr.toFixed(4)),
      recall:      parseFloat(recall.toFixed(4)),
      rankedCount: ranked.length,
      top3DOIs:    rankedDOIs.slice(0, 3),
      relevantDOIs,
    };

  } catch (err) {
    logger.warn(`[Eval] Error for "${query}": ${err.message}`);
    return { disease, query, mrr: 0, recall: 0, rankedCount: 0, error: err.message };
  }
}

router.get('/', async (req, res) => {
  logger.info('[Eval] Starting evaluation run...');
  const t0 = Date.now();

  try {

    const perQuery = [];
    for (const testCase of TEST_QUERIES) {
      logger.info(`[Eval] Running: "${testCase.query}"`);
      const result = await runSingleEval(testCase);
      perQuery.push(result);
    }

    const validResults = perQuery.filter((r) => !r.error);
    const avgMRR    = validResults.length > 0
      ? validResults.reduce((s, r) => s + r.mrr, 0) / validResults.length : 0;
    const avgRecall = validResults.length > 0
      ? validResults.reduce((s, r) => s + r.recall, 0) / validResults.length : 0;

    const elapsedMs = Date.now() - t0;
    logger.info(`[Eval] Done: MRR@8=${avgMRR.toFixed(3)}, Recall@8=${avgRecall.toFixed(3)} (${elapsedMs}ms)`);

    res.json({
      mrr:       parseFloat(avgMRR.toFixed(4)),
      recall:    parseFloat(avgRecall.toFixed(4)),
      atK:       8,
      queriesRun: TEST_QUERIES.length,
      queriesPassed: validResults.length,
      elapsedMs,
      perQuery,
    });

  } catch (err) {
    logger.error(`[Eval] Evaluation failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
