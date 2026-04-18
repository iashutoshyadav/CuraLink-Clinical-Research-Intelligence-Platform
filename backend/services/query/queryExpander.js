import axios from 'axios';
import logger from '../../utils/logger.js';
import { QUERY_VARIANTS } from '../../config/constants.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';

const OLLAMA_EXPANSION_MODEL = process.env.OLLAMA_EXPANSION_MODEL ?? 'llama3.1:8b';

export async function expandQuery(disease, userQuery) {
  try {
    const result = await expandWithOllama(disease, userQuery);
    if (result) return result;
  } catch (err) {
    logger.warn(`[QueryExpander] LLM expansion failed: ${err.message} — using rule-based fallback`);
  }

  const fallback = buildRuleBasedExpansions(disease, userQuery);
  logger.info(`[QueryExpander] Using rule-based expansion (${fallback.length} variants)`);
  return fallback;
}

async function expandWithOllama(disease, userQuery) {
  const prompt = buildExpansionPrompt(disease, userQuery);

  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model:  OLLAMA_EXPANSION_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 300,
        num_ctx:     512,
      },
    },
    {
      timeout: 2_000,
    },
  );

  const text  = response.data?.response ?? '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return null;

  const variants = JSON.parse(match[0]);
  if (!Array.isArray(variants) || variants.length === 0) return null;

  const valid = variants
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .slice(0, QUERY_VARIANTS);

  logger.info(`[QueryExpander] LLM produced ${valid.length} variants via ${OLLAMA_EXPANSION_MODEL}`);
  return valid;
}

function buildExpansionPrompt(disease, userQuery) {
  return `You are a biomedical search specialist.
Given disease: "${disease}" and user query: "${userQuery}"

Generate exactly ${QUERY_VARIANTS} distinct academic database search queries.
Cover different angles: (1) mechanism/pathophysiology, (2) clinical treatments, (3) outcomes/trials, (4) recent advances.
Always include the disease name in each query.

Return ONLY a valid JSON array of strings. No explanation, no markdown.
Example: ["query one", "query two", "query three", "query four"]`;
}

const MESH_MAP = {
  "parkinson's disease":  'Parkinson Disease',
  "parkinsons disease":   'Parkinson Disease',
  "parkinson":            'Parkinson Disease',
  "alzheimer's disease":  'Alzheimer Disease',
  "alzheimers disease":   'Alzheimer Disease',
  "alzheimer":            'Alzheimer Disease',
  "lung cancer":          'Carcinoma, Non-Small-Cell Lung',
  "diabetes":             'Diabetes Mellitus, Type 2',
  "type 2 diabetes":      'Diabetes Mellitus, Type 2',
  "type 1 diabetes":      'Diabetes Mellitus, Type 1',
  "heart disease":        'Coronary Artery Disease',
  "heart failure":        'Heart Failure',
  "breast cancer":        'Breast Neoplasms',
  "prostate cancer":      'Prostatic Neoplasms',
  "multiple sclerosis":   'Multiple Sclerosis',
  "depression":           'Depressive Disorder, Major',
  "hypertension":         'Hypertension',
  "stroke":               'Stroke',
  "copd":                 'Pulmonary Disease, Chronic Obstructive',
  "asthma":               'Asthma',
  "rheumatoid arthritis": 'Arthritis, Rheumatoid',
  "epilepsy":             'Epilepsy',
  "schizophrenia":        'Schizophrenia',
};

export function getMeshQuery(disease, userQuery) {
  const key      = disease.toLowerCase().replace(/[''`]/g, '');
  const meshTerm = MESH_MAP[key];

  if (meshTerm) {

    return `("${meshTerm}"[MeSH] OR "${disease}"[tiab]) AND ${userQuery}`;
  }
  return `${disease} ${userQuery}`;
}

function buildRuleBasedExpansions(disease, userQuery) {
  const mesh = getMeshQuery(disease, userQuery);

  const searchTerms = userQuery
    .replace(/^(what|who|how|why|when|where|is|are|does|do|can|which|tell me about)\s+/i, '')
    .replace(/[?!]/g, '')
    .trim();

  return [
    mesh,
    `${disease} ${searchTerms}`,
    `${disease} ${searchTerms} systematic review`,
    `${disease} ${searchTerms} clinical trial`,
  ].slice(0, QUERY_VARIANTS);
}
