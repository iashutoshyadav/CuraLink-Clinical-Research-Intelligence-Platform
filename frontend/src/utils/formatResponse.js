export function parseStructuredResponse(data) {
  if (!data) return null;

  return {
    conditionOverview:    data.conditionOverview || '',
    keyFindings:          Array.isArray(data.keyFindings) ? data.keyFindings : [],
    treatmentAnalysis:    Array.isArray(data.treatmentAnalysis) ? data.treatmentAnalysis : [],
    researchInsights:     Array.isArray(data.researchInsights) ? data.researchInsights : [],
    outcomesSummary:      Array.isArray(data.outcomesSummary) ? data.outcomesSummary : [],
    limitations:          Array.isArray(data.limitations) ? data.limitations : [],
    clinicalTrialsSummary: data.clinicalTrialsSummary || data.clinicalTrialsInsights || '',
    contradictions:       data.contradictions || null,
    recommendation:       data.recommendation || '',
    confidenceLabel:      data.confidenceLabel || null,
    topResearchers:       Array.isArray(data.topResearchers) ? data.topResearchers : [],
    disclaimer:           data.disclaimer || '',
    sources:              Array.isArray(data.sources) ? data.sources : [],
    publications:         Array.isArray(data.publications) ? data.publications : [],
    trials:               Array.isArray(data.trials) ? data.trials : [],
    confidence_score:     typeof data.confidence_score === 'number' ? data.confidence_score : null,
    validation:           data.validation || null,
    validationNotice:     data.validationNotice || null,
    metrics:              data.metrics || null,
    provider:             data.provider || null,
  };
}

export function formatConfidence(score) {
  if (score === null || score === undefined) return null;
  return `${Math.round(score * 100)}%`;
}

export function getConfidenceLevel(score) {
  if (score === null || score === undefined) return null;
  if (score >= 0.75) return { label: 'High', color: 'text-green-400' };
  if (score >= 0.50) return { label: 'Moderate', color: 'text-yellow-400' };
  if (score >= 0.30) return { label: 'Low', color: 'text-orange-400' };
  return { label: 'Very Low', color: 'text-red-400' };
}

export function truncate(text, limit = 200) {
  if (!text) return '';
  return text.length <= limit ? text : `${text.slice(0, limit)}...`;
}

export function formatMetrics(metrics) {
  if (!metrics) return null;
  return {
    total: `${(metrics.totalMs / 1000).toFixed(1)}s`,
    fetch: `${(metrics.fetchMs / 1000).toFixed(1)}s`,
    ranking: `${metrics.rankingMs}ms`,
    llm: `${(metrics.llmMs / 1000).toFixed(1)}s`,
    papers: `${metrics.papersRetrieved} fetched → ${metrics.papersShown} shown`,
    trials: `${metrics.trialsShown} shown`,
    variants: metrics.queryVariants,
  };
}
