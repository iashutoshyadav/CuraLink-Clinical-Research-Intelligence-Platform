import { buildV2Prompt } from '../../prompts/v2.js';

export function buildPrompt(
  disease, query, patientName, location,
  pubs, trials, conversationHistory, userProfile, topResearchers = [],
  focusMode = null,
) {
  return buildV2Prompt(
    disease, query, patientName, location,
    pubs, trials, conversationHistory, userProfile, topResearchers,
    focusMode,
  );
}
