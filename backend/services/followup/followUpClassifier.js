const REFINEMENT_PATTERNS = [
  /\b(in india|in china|in the usa|in the uk|in canada|in australia|in europe|in asia)\b/i,
  /\b(trials? in|available in|conducted in|near me)\b/i,
  /\b(for (children|kids|elderly|seniors|adults|women|men|patients))\b/i,
  /\b(only recent|last \d+ years?|from \d{4}|since \d{4})\b/i,
  /\b(explain|simplify|summarize|summarise|in simple terms|eli5)\b/i,
  /\b(more detail|tell me more|expand on|elaborate)\b/i,
];

const DRILL_DOWN_PATTERNS = [
  /\b(side effects?|adverse effects?|risks?|complications?)\b/i,
  /\b(dosage|dose|how much|how often|frequency|timing)\b/i,
  /\b(mechanism|how does|how do|mode of action|works?)\b/i,
  /\b(interactions?|drug interactions?|contraindications?)\b/i,
  /\b(top researcher|leading researcher|key expert|who (is|are|studies))\b/i,
  /\b(survival rate|prognosis|outcome|mortality|five.year|10.year)\b/i,
  /\b(clinical trials?|ongoing trials?|phase [123])\b/i,
];

const CONTEXTUAL_PATTERNS = [
  /\b(can i|should i|is it safe for me|would it help me|is this right for me)\b/i,
  /\b(for my (condition|case|situation)|given (my|that i have))\b/i,
  /\b(i (have|am|was diagnosed|take|am taking|suffer from))\b/i,
  /\b(suitable for me|recommended for me|work for me|help with my)\b/i,
];

const COMPARISON_PATTERNS = [
  /\b(vs\.?|versus|compared to|compared with|better than|worse than)\b/i,
  /\b(difference between|which is (better|safer|more effective))\b/i,
  /\b(alternative to|instead of|over|prefer)\b/i,
];

function matchesAny(query, patterns) {
  return patterns.some((re) => re.test(query));
}

export function classifyFollowUp(query, previousQuery, disease) {
  if (!previousQuery) {

    return { type: 'new_query', focusMode: null };
  }

  const q = query.toLowerCase();

  if (matchesAny(q, CONTEXTUAL_PATTERNS)) {
    return { type: 'contextual', focusMode: 'contextual' };
  }
  if (matchesAny(q, COMPARISON_PATTERNS)) {
    return { type: 'comparison', focusMode: 'contextual' };
  }
  if (matchesAny(q, DRILL_DOWN_PATTERNS)) {
    return { type: 'drill_down', focusMode: 'drill_down' };
  }
  if (matchesAny(q, REFINEMENT_PATTERNS)) {
    return { type: 'refinement', focusMode: null };
  }

  return { type: 'new_topic', focusMode: null };
}
