import logger from '../../utils/logger.js';

let _loaded = false;

export async function crossEncoderRerank(query, candidates) {
  try {
    const { AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');
    let model, tokenizer;
    const loaded = await Promise.all([
      AutoTokenizer.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2'),
      AutoModelForSequenceClassification.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2', { quantized: true }),
    ]);
    [tokenizer, model] = loaded;
    _loaded = true;
    logger.info('[CrossEncoder] ms-marco-MiniLM-L-6-v2 loaded');
    const inputs = tokenizer(candidates.map(() => query), {
      text_pair: candidates.map((d) => `${d.title}. ${(d.abstract || '').slice(0, 300)}`),
      padding: true, truncation: true, max_length: 512, return_tensor: true,
    });
    const { logits } = await model(inputs);
    candidates.forEach((doc, i) => { doc.crossEncoderScore = logits.data[i] ?? 0; });
    candidates.sort((a, b) => b.crossEncoderScore - a.crossEncoderScore);
    return candidates;
  } catch (err) {
    logger.warn(`[CrossEncoder] Failed (${err.message})`);
    return candidates;
  }
}

export function getCrossEncoderStatus() {
  return _loaded ? 'ready' : 'loading';
}

export async function warmUpCrossEncoder() {
  try {
    const { AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');
    await Promise.all([
      AutoTokenizer.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2'),
      AutoModelForSequenceClassification.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2', { quantized: true }),
    ]);
    _loaded = true;
    logger.info('[CrossEncoder] Warm-up complete');
  } catch (err) {
    logger.warn(`[CrossEncoder] Warm-up failed: ${err.message}`);
  }
}
