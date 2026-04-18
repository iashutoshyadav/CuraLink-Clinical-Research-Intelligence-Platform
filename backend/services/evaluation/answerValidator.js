import logger from '../../utils/logger.js';
import { VALIDATION } from '../../config/constants.js';

const CITATION_RE = /\[([PT]\d+)\]/g;

const NUMERIC_RE = /\b(\d[\d.,]*\s*(?:%|mg|ml|mmol|mmHg|months?|years?|weeks?|days?|kg|IU|μg|ng|mcg)|\bn\s*=\s*\d+|p\s*[<>=]\s*0\.\d+|\d+\s*(?:patients?|participants?|subjects?|cases?))\b/gi;

const DRUG_SUFFIX_RE = /\b[A-Z][a-z]+(?:inib|mab|zumab|tinib|ciclib|rafenib|lukast|prazole|sartan|statin|mycin|cillin|oxacin|vir|tide)\b/g;

function getEvidenceText(citationTag, publications) {
  const idx = parseInt(citationTag.slice(1), 10) - 1;
  if (citationTag[0] !== 'P') return '';
  const pub = publications[idx];
  if (!pub) return '';
  if (pub.passages?.length) return pub.passages.join(' ');
  return pub.abstract || pub.title || '';
}

function fuzzyNumericMatch(numStr, evidenceText) {
  const normalised = numStr.replace(/\s+/g, '').toLowerCase();
  const evidence   = evidenceText.toLowerCase().replace(/\s+/g, '');

  if (evidence.includes(normalised)) return true;

  const numVal = parseFloat(numStr.replace(/[^0-9.]/g, ''));
  if (isNaN(numVal) || numVal === 0) {

    const digits = numStr.replace(/[^0-9.]/g, '');
    return digits.length >= 2 && evidence.includes(digits);
  }

  const sourceNums = [...evidenceText.matchAll(/\d+\.?\d*/g)]
    .map((m) => parseFloat(m[0]))
    .filter((n) => !isNaN(n) && n > 0);

  return sourceNums.some((n) => Math.abs(n - numVal) / Math.max(numVal, n, 1) < 0.05);
}

function isNumericGrounded(numericFact, citationTags, publications) {
  for (const tag of citationTags) {
    const evidence = getEvidenceText(tag, publications);
    if (fuzzyNumericMatch(numericFact, evidence)) return true;
  }
  return false;
}

function checkDrugGrounding(insightText, citationTags, publications) {
  const drugNames = insightText.match(DRUG_SUFFIX_RE) ?? [];
  const ungrounded = [];

  for (const drug of drugNames) {
    let found = false;
    for (const tag of citationTags) {
      const evidence = getEvidenceText(tag, publications);
      if (evidence.toLowerCase().includes(drug.toLowerCase())) { found = true; break; }
    }
    if (!found) ungrounded.push(drug);
  }
  return ungrounded;
}

export function validateAnswer(structuredOutput, confidenceScore, publications) {
  const result = {
    passed:         true,
    hasIssues:      false,
    warnings:       [],
    hallucinations: [],
    overrideNotice: null,
  };

  logger.debug(`[Validator] Checking answer — confidence: ${confidenceScore.toFixed(3)}`);

  const insights = structuredOutput.researchInsights || [];

  const allTextFields = [
    ...insights.map((ins) => (ins.insight ?? '') + (ins.citation ?? '')),
    ...(structuredOutput.keyFindings || []),
    ...(structuredOutput.treatmentAnalysis || []),
  ];
  const fieldsWithCitations = allTextFields.filter((text) => {
    CITATION_RE.lastIndex = 0;
    return CITATION_RE.test(text);
  });

  if (allTextFields.length > 0 && fieldsWithCitations.length < Math.ceil(allTextFields.length / 3)) {
    result.warnings.push('Less than one third of findings have inline citations — possible hallucination.');
    result.hasIssues = true;
  }

  const enrichedInsights = insights.map((ins) => {
    const insightText = ins.insight ?? '';
    const citationText = insightText + (ins.citation ?? '');
    const citationTags = [...citationText.matchAll(/\[([PT]\d+)\]/g)].map((m) => m[1]);
    const insightWarnings = [];

    const numericFacts = insightText.match(NUMERIC_RE) ?? [];
    if (numericFacts.length > 0) {
      if (citationTags.length === 0) {
        insightWarnings.push('Numeric facts present without any citation');
        result.hallucinations.push({
          claim: insightText.slice(0, 100),
          issue: 'Numeric facts present without any citation',
        });
        result.hasIssues = true;
      } else {
        for (const fact of numericFacts) {
          if (!isNumericGrounded(fact, citationTags, publications)) {
            const msg = `"${fact}" not found in cited source(s): ${citationTags.join(', ')}`;
            insightWarnings.push(msg);
            result.hallucinations.push({ claim: insightText.slice(0, 100), number: fact, issue: msg });
            result.hasIssues = true;
          }
        }
      }
    }

    if (citationTags.length > 0) {
      const ungDrugs = checkDrugGrounding(insightText, citationTags, publications);
      for (const drug of ungDrugs) {
        const msg = `Drug "${drug}" not found in cited source(s): ${citationTags.join(', ')}`;
        insightWarnings.push(msg);
        result.hallucinations.push({ claim: insightText.slice(0, 100), drug, issue: msg });
        result.hasIssues = true;
      }
    }

    return {
      ...ins,
      _verified: insightWarnings.length === 0,
      _warnings: insightWarnings,
    };
  });

  structuredOutput.researchInsights = enrichedInsights;

  if (publications.length < VALIDATION.MIN_PUBLICATIONS) {
    result.warnings.push(`Insufficient source literature retrieved (${publications.length} papers).`);
    result.hasIssues = true;
  }

  if (confidenceScore < VALIDATION.MIN_CONFIDENCE) {
    result.warnings.push(`Low confidence score (${(confidenceScore * 100).toFixed(0)}%).`);
    result.hasIssues = true;
  }

  const hasContent = (structuredOutput.keyFindings?.length > 0)
    || (structuredOutput.treatmentAnalysis?.length > 0)
    || insights.length > 0;
  if (!structuredOutput.conditionOverview || !structuredOutput.recommendation || !hasContent) {
    result.warnings.push('Incomplete output structure — missing key fields.');
    result.hasIssues = true;
  }

  if (result.hasIssues) {
    result.passed = false;
    if (result.hallucinations.length > 0) {
      result.overrideNotice = `⚠️ Numeric/drug verification: ${result.hallucinations.length} claim(s) could not be grounded in cited sources. See inline ⚠ markers. Verify before use.`;
      logger.warn(`[Validator] Grounding failures: ${JSON.stringify(result.hallucinations.slice(0, 3))}`);
    } else {
      result.overrideNotice = `⚠️ Validation warning: ${result.warnings[0]}`;
      logger.warn(`[Validator] Validation failed: ${result.warnings.join(' | ')}`);
    }
  } else {
    logger.debug('[Validator] Answer validation passed.');
  }

  return result;
}
