export function buildV1Prompt(disease, query, patientName, location, pubs, trials) {
  return `You are Curalink, a medical research assistant.
Disease: ${disease}
Query: ${query}

Write a detailed response based ONLY on the provided context below.

PUBLICATIONS:
${pubs.map((p, i) => `[${i + 1}] Title: ${p.title}\nAbstract: ${p.abstract}`).join('\n\n')}

TRIALS:
${trials.map((t, i) => `[T${i + 1}] Title: ${t.title}\nStatus: ${t.status}\nEligibility: ${t.eligibility}`).join('\n\n')}

Analyze the documents and answer the user's query.`;
}
