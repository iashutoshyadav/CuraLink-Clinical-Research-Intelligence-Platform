const CHARS_PER_TOKEN = 4;

const FIXED_OVERHEAD_TOKENS = 800;

const OLLAMA_MAX_INPUT_TOKENS = 1_400;

export function estimateTokens(text) {
  return Math.ceil((text || '').length / CHARS_PER_TOKEN);
}

export function enforceTokenBudget({ historySummary, publications, trials, maxInputTokens }) {
  const MAX_INPUT      = maxInputTokens ?? OLLAMA_MAX_INPUT_TOKENS;
  const MAX_HISTORY    = Math.floor(MAX_INPUT * 0.05);
  const MAX_TRIALS     = Math.floor(MAX_INPUT * 0.12);

  let budget = MAX_INPUT - FIXED_OVERHEAD_TOKENS;

  let historyTokens = estimateTokens(historySummary);
  let safeHistory   = historySummary;

  if (historyTokens > MAX_HISTORY) {
    safeHistory   = (historySummary || '').slice(0, MAX_HISTORY * CHARS_PER_TOKEN) + '...';
    historyTokens = MAX_HISTORY;
  }
  budget -= historyTokens;

  let safeTrials   = trials;
  let trialsTokens = estimateTokens(JSON.stringify(trials));

  if (trialsTokens > MAX_TRIALS) {
    safeTrials = trials.map((t) => ({
      ...t,
      eligibility: (t.eligibility || '').split(/[.!?]/)[0] + '.',
    }));
    trialsTokens = Math.min(estimateTokens(JSON.stringify(safeTrials)), MAX_TRIALS);
  }
  budget -= trialsTokens;

  if (budget <= 0) {
    return { historySummary: safeHistory, publications: publications.slice(0, 4), trials: safeTrials };
  }

  const tokenPerPub = Math.floor(budget / Math.max(publications.length, 1));

  let safePubs = publications.map((p) => {
    const charsPerPub = tokenPerPub * CHARS_PER_TOKEN;
    if (p.passages && p.passages.length > 0) {
      let passageText = '';
      const trimmedPassages = [];
      for (const passage of p.passages) {
        if ((passageText + passage).length > charsPerPub) break;
        passageText += passage + ' ';
        trimmedPassages.push(passage);
      }
      return { ...p, passages: trimmedPassages.length ? trimmedPassages : [p.passages[0]] };
    } else {
      return { ...p, abstract: (p.abstract || '').slice(0, charsPerPub) };
    }
  });

  if (estimateTokens(JSON.stringify(safePubs)) > budget) {
    if (safePubs.length > 6) safePubs = safePubs.slice(0, 6);
    if (estimateTokens(JSON.stringify(safePubs)) > budget) safePubs = safePubs.slice(0, 4);
  }

  return { historySummary: safeHistory, publications: safePubs, trials: safeTrials };
}
