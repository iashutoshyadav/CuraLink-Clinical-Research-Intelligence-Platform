const MAX_ABSTRACT_CHARS = 500;

function detectTone(query) {
  const q = (query || '').toLowerCase();
  if (/like\s+i\s+am\s+\d+\s+years?\s+old|like\s+a\s+child|explain\s+simply|simple\s+explanation|in\s+simple\s+terms|layman|non.technical|easy\s+to\s+understand|dumb\s+it\s+down/.test(q))
    return 'simple';
  if (/technical\s+detail|in.depth|advanced|expert\s+level|clinical\s+detail/.test(q))
    return 'technical';
  return null;
}

export function buildV2Prompt(
  disease, query, patientName, location,
  pubs, trials, conversationHistory, userProfile, topResearchers = [],
  focusMode = null,
) {

  if (focusMode === 'contextual') {
    return buildContextualPrompt(disease, query, pubs, conversationHistory, patientName, userProfile);
  }
  if (focusMode === 'drill_down') {
    return buildDrillDownPrompt(disease, query, pubs, topResearchers, patientName, userProfile);
  }

  let contextStr = '';

  if (pubs && pubs.length > 0) {
    contextStr += '### RESEARCH PUBLICATIONS (ranked by relevance) ###\n';
    pubs.forEach((p, i) => {
      const authors = Array.isArray(p.authors)
        ? p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '')
        : (p.authors || 'Unknown');
      const citations = p.citationCount ? ` | Cited by: ${p.citationCount}` : '';
      const studyType = p.studyType ? ` | Study type: ${p.studyType}` : '';

      let evidenceText;
      if (p.passages && p.passages.length > 0) {
        evidenceText = `Key findings:\n${p.passages.map((s) => `  • ${s}`).join('\n')}`;
      } else {
        const abs = (p.abstract || '').slice(0, MAX_ABSTRACT_CHARS);
        evidenceText = `Abstract: ${abs}${(p.abstract?.length ?? 0) > MAX_ABSTRACT_CHARS ? '...' : ''}`;
      }

      contextStr += [
        `[P${i + 1}] "${p.title}"`,
        `Authors: ${authors} (${p.year || 'n/d'})${citations}${studyType}`,
        `Source: ${p.source || 'Academic'} | URL: ${p.url || 'N/A'}`,
        evidenceText,
        '',
      ].join('\n');
    });
  }

  if (trials && trials.length > 0) {
    const trialsForLLM = trials.slice(0, 6);
    contextStr += `### CLINICAL TRIALS (top ${trialsForLLM.length} shown — see Trials tab for all) ###\n`;
    trialsForLLM.forEach((t, i) => {
      const eligibility = (t.eligibility || '').substring(0, 150);
      contextStr += [
        `[T${i + 1}] "${t.title}"`,
        `Status: ${t.status} | Phase: ${t.phase || 'N/A'} | Location: ${t.location || 'Not specified'}`,
        `Eligibility: ${eligibility}`,
        '',
      ].join('\n');
    });
  }

  if (topResearchers && topResearchers.length > 0) {
    contextStr += '### TOP RESEARCHERS (aggregated from retrieved publications) ###\n';
    topResearchers.forEach((r, i) => {
      contextStr += `[R${i + 1}] ${r.name} | Papers: ${r.paperCount} | Citations: ${r.totalCitations}\n`;
      if (r.topPaper) contextStr += `  Top paper: "${r.topPaper}"\n`;
    });
    contextStr += '\n';
  }

  let historyStr = '';
  if (conversationHistory) {
    if (typeof conversationHistory === 'string' && conversationHistory.trim()) {
      historyStr = `### PRIOR CONVERSATION SUMMARY ###\n${conversationHistory}\n\n`;
    } else if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-6);
      historyStr = '### PRIOR CONVERSATION ###\n';
      recent.forEach((msg) => {
        const content = typeof msg.content === 'string'
          ? msg.content.slice(0, 250)
          : '[structured response]';
        historyStr += `${msg.role.toUpperCase()}: ${content}\n`;
      });
      historyStr += '\n';
    }
  }

  const patientLine  = patientName ? `Patient: ${patientName}` : '';
  const locationLine = location    ? `Location: ${location}`   : '';

  let profileStr = '';
  if (userProfile) {
    const lines = [];
    const name = userProfile.name || patientName;
    if (name)                           lines.push(`Name: ${name}`);
    if (userProfile.conditions?.length) lines.push(`Known conditions: ${userProfile.conditions.join(', ')}`);
    if (userProfile.location || location) lines.push(`Location: ${userProfile.location || location}`);
    const priorQueries = (userProfile.queryHistory || [])
      .slice(-4)
      .map((h) => h.query)
      .filter(Boolean);
    if (priorQueries.length > 0) lines.push(`Prior research topics: ${priorQueries.join('; ')}`);
    if (lines.length > 0) {
      profileStr = `=== PATIENT PROFILE (personalise your response to this patient) ===\n${lines.join('\n')}\n` +
        `INSTRUCTION: Tailor every recommendation specifically to this patient's known conditions and history.\n` +
        `Do NOT give generic population-level advice — address this specific patient's context.\n\n`;
    }
  }

  const _pName       = (userProfile?.name || patientName || '').trim();
  const _pConditions = (userProfile?.conditions || [])
    .filter((c) => c && c.toLowerCase() !== disease.toLowerCase());
  const _pPrior      = (userProfile?.queryHistory || [])
    .slice(-2).map((h) => h.query).filter(Boolean);

  const _personalParts = [];
  if (_pName)               _personalParts.push(`Address ${_pName} directly by name in your opening sentence.`);
  if (_pConditions.length)  _personalParts.push(`Note how their other condition(s) — ${_pConditions.join(', ')} — may interact with or affect this recommendation.`);
  if (_pPrior.length)       _personalParts.push(`They previously researched: "${_pPrior.join('"; "')}" — connect relevant findings where applicable.`);

  const personalizedRecInstruction = _personalParts.length > 0
    ? `PERSONALISATION REQUIRED: ${_personalParts.join(' ')} Then write ONE paragraph covering: (1) What the evidence supports for ${disease} regarding '${query}' [P1][P2]. (2) Who benefits most. (3) What remains uncertain. (4) Specific questions this patient should ask their ${disease} specialist.`
    : `Write ONE paragraph: (1) What evidence most supports for ${disease} given '${query}' [P1][P2]. (2) Who benefits most based on papers. (3) What remains uncertain. (4) Questions to ask a ${disease} doctor.`;

  const tone = detectTone(query);
  const toneInstruction = tone === 'simple'
    ? '\n10. SIMPLE LANGUAGE: Write as if explaining to a curious teenager. Avoid jargon. Replace medical terms with plain words in parentheses. Keep sentences short.'
    : tone === 'technical'
    ? '\n10. TECHNICAL DEPTH: Use precise clinical terminology. Include statistical measures, confidence intervals, and mechanistic details where available.'
    : '';

  return `You are Curalink, an expert Medical AI Research Synthesizer.
You do NOT list papers. You analyze, compare, synthesize, and explain like a medical researcher
presenting conclusions to a colleague — never like a search engine listing results.

=== STRICT RULES ===
1. ZERO HALLUCINATION: Every factual claim MUST come from the provided papers/trials.
   Never invent statistics, percentages, drug names, dosages, or outcomes.
2. MANDATORY CITATIONS: Every claim needs inline citations: [P1], [P1][P4], [T2].
   If you cannot cite a claim from the papers provided, do not make it.
3. NUMERIC FACTS: Any number MUST appear in the cited source verbatim (within 5% tolerance).
4. EVIDENCE HIERARCHY: Prefer RCT > meta-analysis > cohort study > case report.
5. SYNTHESIZE ACROSS PAPERS: Combine findings from 2+ papers per sentence where possible.
   Never say "P1 says X. P2 says Y." — always say "Multiple studies [P1][P2] show X, while [P3] notes Y."
6. CONTRADICTIONS: If papers disagree, explicitly state it with citations.
7. JSON ONLY: Output ONLY valid JSON. No markdown fences, no text before or after.
8. JSON REPAIR: If approaching token limit, close all open brackets before stopping.
9. NO PLACEHOLDERS: NEVER output literal "X%", "Y months", "Z patients", "A vs B" as template text.
   If you have real numbers from the papers, use them (e.g., "45% response rate at 12 months [P1]").
   If you do NOT have real numbers, describe qualitatively WITHOUT any placeholder:
   WRONG: "X% improvement observed at Y months [P1][P3]"
   RIGHT: "Significant improvement in response rates was observed [P1][P3], with survival benefit noted at follow-up."${toneInstruction}

=== QUERY FOCUS (CRITICAL) ===
🎯 Current query: "${query}"
⚠️  Every finding in key_findings and treatment_analysis MUST directly address "${query}".
FORBIDDEN: Generic findings about ${disease} that would be the same regardless of the query.
REQUIRED: Extract findings from the SPECIFIC papers below that are relevant to "${query}".
If papers do not directly discuss "${query}", state: "Limited direct evidence for '${query}' in retrieved literature — related findings include..."

=== SYNTHESIS STYLE (READ CAREFULLY) ===
BAD: "P1 discusses immunotherapy. P2 mentions survival rates."
BAD: "[P1] A Novel Immunotherapy Paradigm in Non-Small Cell Lung Cancer."
GOOD: "Multiple studies [P1][P4] show significant improvement in response rates with immunotherapy,
while [P3] highlights that benefit is limited to PD-L1-positive patients. This suggests patient
selection is critical for treatment success."

${profileStr}=== PATIENT CONTEXT ===
Disease/Condition: ${disease}
Query: ${query}
${patientLine}
${locationLine}

${historyStr}=== EVIDENCE BASE ===
${contextStr}
=== REQUIRED OUTPUT (JSON ONLY) ===
{
  "condition_overview": "2-3 sentences: what is ${disease} in the context of '${query}', and what the overall evidence landscape looks like (strong/mixed/emerging). Reference the papers provided.",

  "key_findings": [
    "Cross-paper synthesis directly addressing '${query}' with real citations and real numbers from papers. Example pattern: 'Multiple studies [P1][P4] demonstrate [specific finding], while [P3] shows [contrasting finding].'",
    "Second finding specific to '${query}' from the evidence base. Use real data from papers if available.",
    "Third finding about patient subgroups or timing relevant to '${query}'."
  ],

  "treatment_analysis": [
    "Comparison of approaches relevant to '${query}': use real RCT data if available, e.g., 'RCT evidence [P1] shows treatment A outperforms B in [specific metric] [P4].'",
    "Which works better and for whom based on retrieved papers: 'Patients with [biomarker] benefit most [P2][P3], while those with [condition] show limited response [P5].'",
    "Timing or sequencing insight from papers: cite specific studies."
  ],

  "outcomes_summary": [
    "Main outcome across studies with citations — use real outcomes from papers, not placeholders.",
    "If specific improvement data exists in papers, cite it. If not: 'Outcome data varied across studies [P1][P2]; consult specific papers for details.'",
    "Safety profile from papers with citations. If not in papers: omit this item."
  ],

  "limitations": [
    "Specific limitation with citation, e.g., 'Small sample size in [P3] limits generalizability'",
    "Another specific limitation from papers with citation",
    "Study design or population limitation with citation"
  ],

  "contradictions": "One sentence on conflicting findings between papers with citations like '[P1] reports benefit while [P3] found no significant difference', or null if no contradictions found.",

  "evidence_grade": {
    "grade": "A | B | C | D",
    "rct_count": 0,
    "meta_count": 0,
    "cohort_count": 0,
    "rationale": "One sentence: e.g., 'Grade A — 2 RCTs [P1][P3] and 1 meta-analysis [P2] provide strong evidence.' Grade A = RCTs/meta-analyses dominant. Grade B = cohort/observational. Grade C = case reports/expert opinion. Grade D = no direct evidence."
  },

  "personalized_recommendation": "${personalizedRecInstruction}",

  "confidence": "High / Moderate / Low — one justification sentence referencing study types and count, e.g., 'Moderate — evidence from 2 RCTs and 3 cohort studies, but heterogeneous populations and short follow-up limit certainty.'",

  "disclaimer": "This is AI-generated research synthesis for informational purposes only. Always consult a qualified medical professional before making any health decisions."
}

CRITICAL: Output ONLY the JSON object above. Do not add any text before { or after }.`;
}

function buildContextualPrompt(disease, query, pubs, conversationHistory, patientName, userProfile) {
  let pubsStr = '';
  if (pubs && pubs.length > 0) {
    pubsStr = '### RETRIEVED PAPERS (searched for this specific question in context of ' + disease + ') ###\n';
    pubs.slice(0, 6).forEach((p, i) => {
      const text = p.passages?.length
        ? p.passages.slice(0, 2).join(' ')
        : (p.abstract || '').slice(0, 300);
      pubsStr += `[P${i + 1}] "${p.title}" (${p.year || 'n/d'}) [${p.source}]\n${text}\n\n`;
    });
  }

  let histStr = '';
  if (conversationHistory) {
    const h = typeof conversationHistory === 'string'
      ? conversationHistory
      : Array.isArray(conversationHistory)
        ? conversationHistory.slice(-4).map((m) => `${m.role.toUpperCase()}: ${(m.content || '').slice(0, 200)}`).join('\n')
        : '';
    if (h) histStr = `### PRIOR CONVERSATION CONTEXT ###\n${h}\n\n`;
  }

  const patientCtx = (() => {
    const name = (userProfile?.name || patientName || '').trim();
    const conditions = (userProfile?.conditions || []).filter(Boolean);
    const parts = [];
    if (name) parts.push(`Patient name: ${name}`);
    if (conditions.length) parts.push(`Other known conditions: ${conditions.join(', ')}`);
    return parts.length ? `=== PATIENT CONTEXT ===\n${parts.join('\n')}\nTailor your answer to THIS patient specifically.\n\n` : '';
  })();

  return `You are Curalink, a Medical AI Research Synthesizer.
A patient with ${disease} is asking: "${query}"

Your job: Answer this question SPECIFICALLY in the context of ${disease}, using ONLY the papers below.
DO NOT give generic information about ${query}. Every point must reference ${disease} patients specifically.

=== STRICT RULES ===
1. Answer directly: Start with "Based on research in ${disease} patients..."
2. Use ONLY information from the papers provided — no outside knowledge.
3. Every claim needs [P#] citation.
4. If papers don't directly address "${query}" in ${disease}: say so explicitly, don't fabricate.
5. JSON ONLY — no text outside the JSON object.
6. NO PLACEHOLDERS: never output "X%", "Y months", etc.

${patientCtx}${histStr}${pubsStr}
=== REQUIRED OUTPUT (JSON ONLY) ===
{
  "focused_answer": {
    "direct_answer": "Yes/No/It depends — one sentence directly answering '${query}' for ${disease} patients, with citations if available.",
    "disease_specific_evidence": "3-4 sentences citing what the retrieved papers specifically say about '${query}' in ${disease} patients. Start each claim with [P#]. If no direct evidence: 'No direct evidence for this in retrieved ${disease} literature.'",
    "key_findings": [
      "Specific finding from retrieved papers about '${query}' in ${disease} context [P#]",
      "Second finding if available [P#]"
    ],
    "cautions": "Disease-specific cautions from papers, or 'No specific cautions identified in retrieved literature.'",
    "consult_guidance": "What to specifically ask a ${disease} specialist about '${query}'."
  },
  "condition_overview": "One sentence: patient has ${disease} and is asking about ${query}.",
  "disclaimer": "This is AI-generated research synthesis. Always consult a qualified ${disease} specialist before making any decisions about ${query}."
}

CRITICAL: Output ONLY the JSON object. No text before { or after }.`;
}

function buildDrillDownPrompt(disease, query, pubs, topResearchers = [], patientName, userProfile) {
  let pubsStr = '';
  if (pubs && pubs.length > 0) {
    pubsStr = '### RETRIEVED PAPERS ###\n';
    pubs.slice(0, 6).forEach((p, i) => {
      const text = p.passages?.length
        ? p.passages.slice(0, 2).join(' ')
        : (p.abstract || '').slice(0, 300);
      pubsStr += `[P${i + 1}] "${p.title}" (${p.year || 'n/d'})\n${text}\n\n`;
    });
  }

  const isResearcherQuery = /top\s+researcher|leading\s+expert|who\s+(?:are|is)\s+the\s+top/i.test(query);

  if (isResearcherQuery && topResearchers.length > 0) {
    const rList = topResearchers.map((r, i) =>
      `[R${i + 1}] ${r.name} — ${r.paperCount} papers, ${r.totalCitations} citations. Top paper: "${r.topPaper || 'N/A'}"`
    ).join('\n');

    return `You are Curalink. The user asked: "${query}" about ${disease}.
Here are the top researchers computed from retrieved publications:
${rList}

Output ONLY this JSON:
{
  "focused_answer": {
    "direct_answer": "The top researchers in ${disease} based on retrieved publications are listed below.",
    "researchers": ${JSON.stringify(topResearchers.slice(0, 6))},
    "disease_specific_evidence": "These researchers were identified by aggregating authorship and citation counts across retrieved ${disease} publications.",
    "key_findings": [],
    "cautions": null,
    "consult_guidance": "Consider reviewing their most-cited works for comprehensive evidence."
  },
  "condition_overview": "Top researcher analysis for ${disease}.",
  "disclaimer": "Researcher rankings based on retrieved publication corpus only."
}`;
  }

  return `You are Curalink, a Medical AI Research Synthesizer.
A patient with ${disease} asked a focused question: "${query}"

Answer ONLY what was asked. Do not produce a full condition overview or treatment analysis.
Use ONLY the papers below. Cite every claim with [P#]. No placeholder text like "X%" or "Y months".
JSON ONLY.

${pubsStr}
=== REQUIRED OUTPUT (JSON ONLY) ===
{
  "focused_answer": {
    "direct_answer": "Direct answer to '${query}' for ${disease} patients, with citations.",
    "disease_specific_evidence": "Evidence from retrieved papers directly relevant to '${query}' in ${disease}.",
    "key_findings": [
      "Specific finding [P#]",
      "Second finding if available [P#]"
    ],
    "cautions": "Relevant cautions from papers, or null.",
    "consult_guidance": "What to discuss with a specialist about this specific question."
  },
  "condition_overview": "One sentence summary for ${disease} regarding '${query}'.",
  "disclaimer": "AI-generated research synthesis. Consult a qualified physician."
}

CRITICAL: Output ONLY the JSON object above.`;
}
