import pLimit from 'p-limit';
import logger from '../utils/logger.js';
import { createRequestObserver } from '../utils/metrics.js';

import { expandQuery } from '../services/query/queryExpander.js';
import { fetchPubMed } from '../services/fetchers/pubmedFetcher.js';
import { fetchOpenAlex } from '../services/fetchers/openAlexFetcher.js';
import { fetchClinicalTrials } from '../services/fetchers/clinicalTrialsFetcher.js';
import { rankPublications } from '../services/ranking/hybridRanker.js';
import { extractAllPassages } from '../services/ranking/passageExtractor.js';
import { enforceTokenBudget } from '../utils/tokenGuard.js';
import { buildPrompt } from '../services/llm/promptBuilder.js';
import { generateResponseStream } from '../services/llm/llmService.js';
import { extractJSONFromLLM, ensureSchema } from '../services/formatter/responseFormatter.js';
import { validateAnswer } from '../services/evaluation/answerValidator.js';
import { computeConfidenceScore } from '../utils/scorer.js';

import { API_CONCURRENCY_LIMIT, MAX_UNIQUE_PAPERS, GROQ_MAX_INPUT_TOKENS } from '../config/constants.js';
import { embedQueryText, searchVectorCache, storeVectorCache } from '../services/cache/vectorCache.js';

function parseDateFilter(query) {
  const q = query.toLowerCase();

  const lastN = q.match(/last\s+(\d+)\s+years?/);
  if (lastN) {
    const year = new Date().getFullYear() - parseInt(lastN[1], 10);
    return `${year}-01-01`;
  }
  if (/last\s+year/.test(q)) return `${new Date().getFullYear() - 1}-01-01`;

  const sinceYear = q.match(/since\s+(20\d{2})/);
  if (sinceYear) return `${sinceYear[1]}-01-01`;

  const fromYear = q.match(/from\s+(20\d{2})/);
  if (fromYear) return `${fromYear[1]}-01-01`;

  if (/recent\s+studi|recent\s+research|recent\s+paper/.test(q)) {
    return `${new Date().getFullYear() - 2}-01-01`;
  }
  return null;
}

function aggregateTopAuthors(publications, disease = '', topN = 8) {
  const authorMap = new Map();

  const diseaseTerms = disease.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length >= 3);

  const relevantPubs = publications.filter((pub) => {
    if (diseaseTerms.length === 0) return true;
    const text = `${pub.title || ''} ${(pub.abstract || '').slice(0, 300)}`.toLowerCase();
    return diseaseTerms.some((t) => text.includes(t));
  });

  const pool = relevantPubs.length >= 3 ? relevantPubs : publications;

  pool.forEach((pub) => {
    const authors = Array.isArray(pub.authors) ? pub.authors : [];
    const citations = pub.citationCount || 0;
    const year = parseInt(pub.year, 10) || 2010;
    const recencyWeight = 1 + Math.max(0, (year - 2010)) / 15;
    const score = citations * recencyWeight;

    authors.forEach((rawName) => {
      const name = (rawName || '').trim();
      if (!name || name.length < 3) return;
      if (!authorMap.has(name)) {
        authorMap.set(name, { name, papers: [], totalCitations: 0, weightedScore: 0 });
      }
      const entry = authorMap.get(name);
      entry.papers.push({ title: pub.title, year: pub.year, citations });
      entry.totalCitations += citations;
      entry.weightedScore += score;
    });
  });

  return [...authorMap.values()]
    .filter((a) => a.papers.length >= 1)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, topN)
    .map((a) => ({
      name:           a.name,
      paperCount:     a.papers.length,
      totalCitations: a.totalCitations,
      topPaper:       a.papers.sort((x, y) => (y.citations || 0) - (x.citations || 0))[0]?.title || '',
    }));
}

function isAuthorQuery(query) {
  return /top\s+researcher|leading\s+(researcher|expert|scientist|author)|who\s+(are|is)\s+the\s+(top|leading|best|key)|key\s+researcher|prominent\s+researcher|notable\s+(researcher|scientist)|expert\s+in\s+this|authors?\s+in\s+this\s+field/i.test(query);
}

const POSITIVE_RE = /\b(effective|significant|improved|reduced|increased|beneficial|successful|superior)\b/i;
const NEGATIVE_RE = /\b(no significant|failed|no difference|not effective|ineffective|no benefit|null result)\b/i;

function detectPotentialConflicts(publications) {
  const positives = publications.filter((p) => POSITIVE_RE.test(p.abstract || ''));
  const negatives = publications.filter((p) => NEGATIVE_RE.test(p.abstract || ''));

  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos !== neg) {
        const posIdx = publications.indexOf(pos) + 1;
        const negIdx = publications.indexOf(neg) + 1;
        return (
          `NOTE: [P${posIdx}] reports positive outcomes while [P${negIdx}] reports ` +
          `null/negative results for similar interventions. Explicitly address this conflict ` +
          `in the "contradictions" field.`
        );
      }
    }
  }
  return null;
}

const OPENALEX_TYPE_MAP = {
  'journal-article':      'Peer-reviewed article',
  'proceedings-article':  'Conference paper',
  'book-chapter':         'Book chapter',
  'review':               'Review article',
  'dataset':              'Dataset',
  'preprint':             'Preprint',
};

const RCT_KEYWORDS = /\b(randomized|randomised|randomized controlled|RCT|placebo.controlled|double.blind)\b/i;
const META_KEYWORDS = /\b(meta.analysis|systematic review|pooled analysis)\b/i;
const COHORT_KEYWORDS = /\b(cohort|prospective|retrospective|observational)\b/i;

function inferStudyType(pub) {

  if (pub.type && OPENALEX_TYPE_MAP[pub.type]) {
    const base = OPENALEX_TYPE_MAP[pub.type];

    const text = `${pub.title || ''} ${pub.abstract || ''}`;
    if (META_KEYWORDS.test(text)) return 'Systematic review / meta-analysis';
    if (RCT_KEYWORDS.test(text)) return 'RCT';
    if (COHORT_KEYWORDS.test(text)) return 'Cohort study';
    return base;
  }

  if (pub.publicationType) {
    if (/Randomized Controlled Trial/i.test(pub.publicationType)) return 'RCT';
    if (/Review/i.test(pub.publicationType)) return 'Review article';
    if (/Meta.Analysis/i.test(pub.publicationType)) return 'Systematic review / meta-analysis';
    return pub.publicationType;
  }

  const text = `${pub.title || ''} ${pub.abstract || ''}`;
  if (META_KEYWORDS.test(text)) return 'Systematic review / meta-analysis';
  if (RCT_KEYWORDS.test(text)) return 'RCT';
  if (COHORT_KEYWORDS.test(text)) return 'Cohort study';
  return null;
}

function generateDeterministicTrialSummary(trials, location = null) {
  if (!trials || trials.length === 0) {
    if (location) return `No active clinical trials found matching the criteria for ${location}.`;
    return 'No active clinical trials found for this query.';
  }

  const recruiting = trials.filter((t) => /RECRUITING/i.test(t.status || ''));
  const countries = new Set();
  trials.forEach((t) => {
    const locs = (t.location || '').split('|').map((l) => l.trim());
    locs.forEach((l) => {
      const parts = l.split(',');
      const country = parts[parts.length - 1]?.trim();
      if (country && country !== 'Not specified') countries.add(country);
    });
  });

  const locationContext = location
    ? ` relevant to ${location}`
    : '';
  const countryList = [...countries].slice(0, 3).join(', ');

  let summary = `${trials.length} interventional trial${trials.length !== 1 ? 's' : ''} identified${locationContext}`;
  if (recruiting.length > 0) {
    summary += `, with ${recruiting.length} currently recruiting`;
  }
  if (countryList) {
    summary += `. Trial sites include: ${countryList}.`;
  } else {
    summary += '.';
  }
  if (trials[0]) {
    summary += ` Top trial: "${trials[0].title.slice(0, 80)}" (${trials[0].status}).`;
  }
  return summary;
}

function filterPapersByQueryRelevance(papers, query, threshold = 0.15) {
  const STOP = new Set(['the','and','for','with','this','that','what','can','are',
    'have','from','about','their','which','does','show','give','tell','latest',
    'recent','top','best','any','some','more','less','good','bad','safe','use',
    'used','how','why','when','where','will','would','should','could','might',
    'may','also','just','only','very','most','many','much','few','all','both',
    'each','other','same','such','well','even','need','want','make','take',
    'include','including','study','studies','research','paper','trial']);

  const queryTerms = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP.has(t));

  if (queryTerms.length === 0) return papers;

  const scored = papers.map((p) => {
    const text = `${p.title || ''} ${(p.abstract || '').slice(0, 500)} ${(p.passages || []).join(' ')}`.toLowerCase();
    const matches = queryTerms.filter((t) => text.includes(t)).length;
    return { pub: p, relevance: matches / queryTerms.length };
  });

  const relevant = scored.filter((s) => s.relevance >= threshold).map((s) => s.pub);

  if (relevant.length >= 4) {
    logger.info(`[DIAG] Query-relevance filter: ${papers.length} → ${relevant.length} papers for "${query}"`);
    return relevant;
  }

  logger.debug(`[DIAG] Query-relevance filter kept only ${relevant.length} papers — using full pool`);
  return papers;
}

export async function runResearchPipeline(params) {
  const {
    disease,
    userQuery,
    patientName,
    location,
    conversationHistory,
    onToken,
    cachedPublications,
    cachedTrials,
    userProfile,
    focusMode = null,
  } = params;

  const observer = createRequestObserver();
  observer.startTimer('pipeline_total');
  logger.info(`[PIPELINE START] Disease: "${disease}" | Query: "${userQuery}"`);

  const metrics = {};

  observer.startTimer('query_expansion');
  const queryVariants = await expandQuery(disease, userQuery);
  metrics.queryVariants = queryVariants.length;
  observer.endTimer('query_expansion', { counts: queryVariants.length });

  // Vector cache check — skip full pipeline on semantic cache hit
  const queryEmbedding = await embedQueryText(`${disease} ${userQuery}`);
  const cachedResult = await searchVectorCache(queryEmbedding, disease);
  if (cachedResult) {
    logger.info(`[PIPELINE] Returning vector cache result for "${disease}" — "${userQuery}"`);
    return {
      ...cachedResult,
      sources: buildSourceMap(cachedResult.publications ?? [], cachedResult.trials ?? []),
      topResearchers: isAuthorQuery(userQuery)
        ? aggregateTopAuthors(cachedResult.publications ?? [], disease)
        : [],
      clinicalTrialsSummary: generateDeterministicTrialSummary(cachedResult.trials ?? [], location),
      metrics: { ...metrics, cached: true },
    };
  }

  observer.startTimer('parallel_fetch');
  let publications = [];
  let trials       = [];
  const fromDate   = parseDateFilter(userQuery);
  if (fromDate) logger.info(`[PIPELINE] Date filter detected: from ${fromDate}`);

  if (cachedPublications && cachedTrials) {
    logger.info('[PIPELINE] Using cached retrieval results (Stage 2 skipped)');
    publications = cachedPublications;
    trials       = cachedTrials;
  } else {
    const limit = pLimit(API_CONCURRENCY_LIMIT);
    const fetchPromises = [];

    queryVariants.forEach((variantQuery) => {
      fetchPromises.push(limit(() => fetchPubMed(variantQuery, undefined, fromDate)));
      fetchPromises.push(limit(() => fetchOpenAlex(variantQuery, undefined, fromDate)));
    });
    fetchPromises.push(limit(() => fetchClinicalTrials(disease, undefined, location)));

    const results = await Promise.allSettled(fetchPromises);

    const papersMap = new Map();
    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) {
        res.value.forEach((item) => {
          if (item.source === 'ClinicalTrials.gov') {
            trials.push(item);
          } else {
            const key = item.doi
              ? `doi:${item.doi.toLowerCase().trim()}`
              : `title:${(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (!papersMap.has(key)) {
              papersMap.set(key, item);
            }
          }
        });
      }
    });

    publications = Array.from(papersMap.values()).slice(0, MAX_UNIQUE_PAPERS);
    observer.recordEvent('deduplication_complete', { uniquePapers: publications.length });

    if (publications.length < 10) {
      logger.warn(`[PIPELINE] 0 results for "${userQuery}" — retrying with disease-only query`);
      const fallbackResults = await Promise.allSettled([
        fetchPubMed(disease),
        fetchOpenAlex(disease),
      ]);
      fallbackResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          res.value.forEach((item) => {
            const key = item.doi
              ? `doi:${item.doi.toLowerCase().trim()}`
              : `title:${(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            if (!papersMap.has(key)) papersMap.set(key, item);
          });
        }
      });
      publications = Array.from(papersMap.values()).slice(0, MAX_UNIQUE_PAPERS);
      logger.info(`[PIPELINE] Disease fallback retrieved ${publications.length} publications`);
    }
  }

  metrics.papersRetrieved = publications.length;
  metrics.fetchMs = observer.endTimer('parallel_fetch', { pubs: publications.length, trials: trials.length });

  if (publications.length === 0) {
    throw new Error('No publications found for this query.');
  }

  publications = publications.map((pub) => ({
    ...pub,
    studyType: pub.studyType || inferStudyType(pub),
  }));

  if (fromDate) {
    const fromYear = parseInt(fromDate.split('-')[0], 10);
    const recent = publications.filter((p) => {
      const y = parseInt(p.year, 10);
      return !isNaN(y) && y >= fromYear;
    });
    if (recent.length >= 6) {
      publications = recent;
      logger.info(`[PIPELINE] Pre-rank recency filter (>=${fromYear}): ${publications.length}/${metrics.papersRetrieved} papers`);
    } else {
      logger.warn(`[PIPELINE] Recency filter (>=${fromYear}) leaves only ${recent.length} papers — using full pool`);
    }
  }

  observer.startTimer('hybrid_ranking');
  const rankedPublications = await rankPublications(publications, userQuery, disease);

  metrics.papersShown = rankedPublications.length;
  metrics.trialsShown = trials.length;
  metrics.rankingMs = observer.endTimer('hybrid_ranking', { topK: rankedPublications.length });

  logger.info('[RANKING]', {
    query:          userQuery,
    bm25Top:        rankedPublications[0]?.doi ?? rankedPublications[0]?.title?.slice(0, 60),
    finalTop:       rankedPublications[0]?.doi ?? rankedPublications[0]?.title?.slice(0, 60),
    topFinalScore:  rankedPublications[0]?.finalScore?.toFixed(4),
    totalRetrieved: publications.length,
    totalRanked:    rankedPublications.length,
  });

  const topResearchers = isAuthorQuery(userQuery)
    ? aggregateTopAuthors(rankedPublications, disease)
    : [];

  logger.info(`[DIAG] Query: "${userQuery}" | Top-3 ranked papers:`);
  rankedPublications.slice(0, 3).forEach((p, i) => {
    logger.info(`[DIAG]   P${i + 1}: "${(p.title || '').slice(0, 80)}" (${p.year}) [${p.source}]`);
  });

  const pubsWithPassages = extractAllPassages(rankedPublications, userQuery);

  const queryFilteredPubs = filterPapersByQueryRelevance(pubsWithPassages, userQuery);

  const conflictNote = detectPotentialConflicts(queryFilteredPubs);
  if (conflictNote) {
    logger.debug(`[PIPELINE] Conflict detected: ${conflictNote.slice(0, 80)}...`);
  }

  const historyForBudget = typeof conversationHistory === 'string'
    ? conversationHistory
    : Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory.map((m) => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n')
      : null;

  const tokenBudget = process.env.GROQ_API_KEY ? GROQ_MAX_INPUT_TOKENS : undefined;

  const budgeted = enforceTokenBudget({
    historySummary: historyForBudget,
    publications:   queryFilteredPubs,
    trials,
    maxInputTokens: tokenBudget,
  });
  const safeHistory = budgeted.historySummary ?? conversationHistory;

  const promptHistory = conflictNote
    ? (typeof safeHistory === 'string' ? `${safeHistory}\n\n${conflictNote}` : conflictNote)
    : safeHistory;

  logger.info(`[DIAG] Sending ${budgeted.publications.length} papers to LLM (focusMode: ${focusMode || 'full'}) for query: "${userQuery}"`);

  const prompt = buildPrompt(
    disease,
    userQuery,
    patientName,
    location,
    budgeted.publications,
    budgeted.trials,
    promptHistory,
    userProfile,
    topResearchers,
    focusMode,
  );

  observer.startTimer('llm_generation');
  logger.info(`[PIPELINE] Stage 4 — LLM reasoning (model: ${process.env.OLLAMA_REASONING_MODEL ?? 'llama3.1:8b'})`);

  let structuredOutput;
  let validationResult;
  let finalConfidence = 0;
  let usedFallback = false;

  try {
    const rawLLMOutput = await generateResponseStream(prompt, onToken);
    metrics.llmMs = observer.endTimer('llm_generation', { success: true });

    const parsedJSON = extractJSONFromLLM(rawLLMOutput);
    structuredOutput = ensureSchema(parsedJSON, rawLLMOutput);

    observer.startTimer('evaluation_layer');
    const rawConfidence = computeConfidenceScore(rankedPublications, trials, null, publications.length);
    validationResult = validateAnswer(structuredOutput, rawConfidence, queryFilteredPubs);

    const hallucCount = validationResult.hallucinations?.length ?? 0;
    const penaltyPerHalluc = 0.12;
    const penalty = Math.min(hallucCount * penaltyPerHalluc, 0.5);
    finalConfidence = rawConfidence * (1 - penalty);
    if (!validationResult.hasIssues) finalConfidence = rawConfidence;

    observer.endTimer('evaluation_layer', { pass: validationResult.passed, score: finalConfidence });

  } catch (err) {

    metrics.llmMs = observer.endTimer('llm_generation', { success: false, error: err.message });
    observer.recordEvent('circuit_breaker_triggered', { reason: err.message });
    logger.warn(`Circuit Breaker Activated! LLM generation failed. Returning raw ranked documents directly. ${err.message}`);

    usedFallback = true;
    finalConfidence = computeConfidenceScore(rankedPublications, trials, null, publications.length);
    structuredOutput = templateSynthesis(disease, userQuery, rankedPublications, trials, publications.length);
    validationResult = { passed: true, hasIssues: false, hallucinations: [], overrideNotice: null };
  }

  metrics.totalMs = observer.endTimer('pipeline_total');

  const requestId = (Date.now() % 100000).toString(36);

  const deterministicTrialSummary = generateDeterministicTrialSummary(trials, location);

  const finalResult = {
    ...structuredOutput,
    clinicalTrialsSummary: deterministicTrialSummary,
    showOnlyFocused: structuredOutput.showOnlyFocused ?? false,
    publications:    rankedPublications,
    trials,
    topResearchers:  isAuthorQuery(userQuery)
      ? (topResearchers.length > 0 ? topResearchers : (structuredOutput.topResearchers ?? []))
      : [],
    sources:         buildSourceMap(rankedPublications, trials, requestId),
    confidence_score: finalConfidence,
    validation:      validationResult,
    validationNotice: validationResult.overrideNotice,
    metrics,
    provider: usedFallback
      ? 'Template Synthesis (Offline)'
      : process.env.GROQ_API_KEY
        ? `Groq — ${process.env.GROQ_MODEL ?? 'llama3-8b-8192'}`
        : `Ollama — ${process.env.OLLAMA_REASONING_MODEL ?? 'mistral:7b'}`,
  };

  // Store in vector cache async — don't block response
  storeVectorCache(queryEmbedding, disease, userQuery, finalResult).catch(() => {});

  return finalResult;
}

function templateSynthesis(disease, userQuery, pubs, trials, totalRetrieved = pubs.length) {
  const top = pubs.slice(0, 8);

  const yearRange  = top.map((p) => p.year).filter(Boolean).sort();
  const latestYear = yearRange[yearRange.length - 1] || 'recent';
  const studyTypes = [...new Set(top.map((p) => p.studyType).filter(Boolean))];

  const conditionOverview =
    `${disease} research on "${userQuery}": ${top.length} highly-ranked publications identified ` +
    `from ${totalRetrieved} retrieved (up to ${latestYear}). ` +
    (studyTypes.length ? `Evidence types: ${studyTypes.join(', ')}.` : '');

  const keyFindings = top.slice(0, 4).map((p, i) => {
    const passage = (p.passages?.[0] || p.abstract || '').slice(0, 150);
    const type    = p.studyType ? ` (${p.studyType})` : '';
    return `${passage ? passage + '… ' : ''}[P${i + 1}]${type}`;
  }).filter(Boolean);

  const treatmentAnalysis = top.slice(0, 3).map((p, i) => {
    const next    = top[i + 1];
    const passage = (p.passages?.[0] || '').slice(0, 100);
    if (next) {
      return `Evidence from [P${i + 1}] and [P${i + 2}] covers related aspects of ${disease} management: ${passage || 'see cited sources for details'}.`;
    }
    return `[P${i + 1}] provides evidence on ${disease}: ${passage || 'ranked highly for relevance'}.`;
  }).filter(Boolean);

  const outcomesSummary = top.slice(0, 3).map((p, i) => {
    const snippet = (p.passages?.[0] || p.abstract || '').slice(0, 120);
    return `${snippet ? snippet + ' ' : ''}[P${i + 1}]`;
  }).filter(Boolean);

  let clinicalTrialsSummary = 'No clinical trials retrieved for this condition.';
  if (trials.length > 0) {
    const recruiting = trials.filter((t) => /recruiting/i.test(t.status || ''));
    clinicalTrialsSummary =
      `${trials.length} trial(s) identified for ${disease}. ` +
      (recruiting.length ? `${recruiting.length} currently recruiting. ` : '') +
      `Top trial: "${trials[0].title}" (${trials[0].status || 'Status unknown'}).`;
  }

  const recommendation =
    `Top evidence for "${disease}" (${userQuery}): [P1]–[P${Math.min(top.length, 3)}] are the most relevant. ` +
    `${trials.length > 0 ? `${trials.length} related trial(s) available — see Trials tab. ` : ''}` +
    `Consult a qualified physician before making medical decisions.`;

  return {
    conditionOverview,
    keyFindings,
    treatmentAnalysis,
    researchInsights: [],
    outcomesSummary,
    limitations:     ['Full limitations analysis requires LLM synthesis. Results are ranked by relevance score.'],
    clinicalTrialsSummary,
    contradictions:  null,
    recommendation,
    confidenceLabel: top.length >= 5
      ? 'Moderate — ranked results from multiple sources, LLM synthesis unavailable.'
      : 'Low — limited results retrieved.',
    disclaimer: 'AI-ranked results from PubMed, OpenAlex, and ClinicalTrials.gov. Consult a physician.',
  };
}

function buildSourceMap(pubs, trials, requestId = '') {
  const suffix = requestId ? `-${requestId}` : '';
  return [
    ...pubs.map((p, i) => ({
      id:        `P${i + 1}${suffix}`,
      displayId: `P${i + 1}`,
      title:     p.title,
      authors:   Array.isArray(p.authors) ? p.authors.join(', ') : p.authors,
      year:      p.year,
      url:       p.url,
      platform:  p.source,
      snippet:   (p.abstract || '').substring(0, 100),
      studyType: p.studyType,
    })),
    ...trials.map((t, i) => ({
      id:        `T${i + 1}${suffix}`,
      displayId: `T${i + 1}`,
      title:     t.title,
      year:      t.startDate?.split('-')?.[0] || 'Ongoing',
      url:       t.url,
      platform:  'ClinicalTrials.gov',
      snippet:   (t.eligibility || '').substring(0, 100),
    })),
  ];
}
