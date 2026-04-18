import { RECENCY_BONUS } from '../config/constants.js';

export function recencyBonus(year) {
  const y = parseInt(year, 10);
  if (!y || isNaN(y)) return 0;
  if (y >= 2023) return RECENCY_BONUS.after2023;
  if (y >= 2021) return RECENCY_BONUS.after2021;
  if (y >= 2019) return RECENCY_BONUS.after2019;
  return 0;
}

export function citationScore(citationCount) {
  if (!citationCount || citationCount <= 0) return 0;
  return Math.min(Math.log10(citationCount + 1) / 5, 1.0);
}

export function computeConfidenceScore(rankedPubs, trials, validationResult, totalRetrieved = null) {
  if (!rankedPubs?.length) return 0;

  const evidenceCount = totalRetrieved ?? rankedPubs.length;
  const pubCountFactor = Math.min(evidenceCount / 150, 1.0);
  const base = 0.30 + pubCountFactor * 0.44;

  const allText = rankedPubs.slice(0, 5).map((p) => p.studyType || '').join(' ');
  const hasHighEvidence = /RCT|meta.analysis|systematic review/i.test(allText);
  const studyBonus = hasHighEvidence ? 0.05 : 0;

  const sources = new Set(rankedPubs.map((p) => p.source));
  const sourceBreadthBonus = sources.size >= 2 ? 0.04 : 0;

  const trialBonus = trials?.length > 0 ? 0.03 : 0;

  const validationPenalty = validationResult?.hasIssues ? -0.15 : 0;

  const raw = base + studyBonus + sourceBreadthBonus + trialBonus + validationPenalty;
  return Math.max(0, Math.min(0.95, parseFloat(raw.toFixed(2))));
}
