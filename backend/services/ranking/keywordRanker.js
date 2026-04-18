const k1 = 1.2;
const b  = 0.75;

export function rankByKeywords(publications, query) {
  if (!publications.length || !query) return publications;

  const queryTerms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (!queryTerms.length) {
    publications.forEach((p) => { p.keywordScore = 0; });
    return publications;
  }

  const docTokens = publications.map((p) => {
    const text = `${p.title} ${p.abstract}`.toLowerCase();
    return text.split(/\W+/).filter((t) => t.length > 2);
  });

  const avgDocLen = docTokens.reduce((s, tk) => s + tk.length, 0) / (docTokens.length || 1);
  const N         = docTokens.length;

  const idf = new Map();
  queryTerms.forEach((term) => {
    if (idf.has(term)) return;
    const df = docTokens.filter((tokens) => tokens.includes(term)).length;

    const val = df === 0 ? 0 : Math.log((N - df + 0.5) / (df + 0.5) + 1);
    idf.set(term, Math.max(val, 0));
  });

  publications.forEach((pub, i) => {
    const tokens = docTokens[i];
    const D      = tokens.length;
    let score    = 0;

    const tfMap = new Map();
    tokens.forEach((t) => tfMap.set(t, (tfMap.get(t) || 0) + 1));

    queryTerms.forEach((term) => {
      const termIdf = idf.get(term) || 0;
      if (termIdf === 0) return;

      const f = tfMap.get(term) || 0;
      const numerator   = f * (k1 + 1);
      const denominator = f + k1 * (1 - b + b * (D / avgDocLen));

      score += termIdf * (numerator / denominator);
    });

    pub.keywordScore = score;
  });

  const maxScore = Math.max(...publications.map((p) => p.keywordScore), 0.0001);
  publications.forEach((p) => {
    p.keywordScore = p.keywordScore / maxScore; // 0.0 - 1.0 range
  });

  return publications;
}
