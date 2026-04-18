import { AutoTokenizer, AutoModelForSequenceClassification } from '@xenova/transformers';
import logger from '../../utils/logger.js';

let crossEncoderModel     = null;
let crossEncoderTokenizer = null;
let modelLoading          = null;

async function getCrossEncoder() {
  if (crossEncoderModel) return { model: crossEncoderModel, tokenizer: crossEncoderTokenizer };
  if (modelLoading)      return modelLoading;

  modelLoading = Promise.all([
    AutoTokenizer.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2'),
    AutoModelForSequenceClassification.from_pretrained(
      'Xenova/ms-marco-MiniLM-L-6-v2',
      { quantized: true },
    ),
  ]).then(([tokenizer, model]) => {
    crossEncoderTokenizer = tokenizer;
    crossEncoderModel     = model;
    modelLoading          = null;
    logger.info('[CrossEncoder] ms-marco-MiniLM-L-6-v2 loaded');
    return { model, tokenizer };
  });

  return modelLoading;
}

export async function crossEncoderRerank(query, candidates) {
  if (!candidates || candidates.length === 0) return candidates;

  try {
    const { model, tokenizer } = await getCrossEncoder();

    const queries  = candidates.map(() => query);
    const passages = candidates.map(
      (doc) => `${doc.title}. ${(doc.abstract || '').slice(0, 300)}`,
    );

    logger.debug(`[CrossEncoder] Scoring ${candidates.length} candidates...`);
    const startMs = Date.now();

    const inputs = tokenizer(queries, {
      text_pair:          passages,
      padding:            true,
      truncation:         true,
      max_length:         512,
      return_tensor:      true,
    });

    const { logits } = await model(inputs);

    const latencyMs = Date.now() - startMs;
    logger.info(`[CrossEncoder] Scored ${candidates.length} docs in ${latencyMs}ms`);

    candidates.forEach((doc, i) => {
      doc.crossEncoderScore = logits.data[i] ?? 0;
    });

    candidates.sort((a, b) => b.crossEncoderScore - a.crossEncoderScore);

    logger.debug(`[CrossEncoder] Top: "${candidates[0]?.title?.slice(0, 60)}" (score: ${candidates[0]?.crossEncoderScore?.toFixed(3)})`);
    return candidates;

  } catch (err) {
    logger.warn(`[CrossEncoder] Failed (${err.message}) — returning RRF order unchanged`);
    return candidates;
  }
}

export function getCrossEncoderStatus() {
  return crossEncoderModel ? 'ready' : 'loading';
}

export async function warmUpCrossEncoder() {
  try {
    logger.info('[CrossEncoder] Warming up model...');
    const { model, tokenizer } = await getCrossEncoder();
    const inputs = tokenizer(['warmup query'], {
      text_pair:     ['warmup passage'],
      padding:       true,
      truncation:    true,
      return_tensor: true,
    });
    await model(inputs);
    logger.info('[CrossEncoder] Warm-up complete');
  } catch (err) {
    logger.warn(`[CrossEncoder] Warm-up failed (non-fatal): ${err.message}`);
  }
}
