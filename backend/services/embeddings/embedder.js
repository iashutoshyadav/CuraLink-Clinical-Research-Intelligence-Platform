import logger from '../../utils/logger.js';

let instance = null;

export async function getEmbedder() {
  if (!instance) {
    const { pipeline } = await import('@xenova/transformers');
    instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  }
  return instance;
}

export async function warmupEmbedder() {
  try {
    const e = await getEmbedder();
    await e('warmup', { pooling: 'mean', normalize: true });
  } catch (err) { logger.error(`Embedder warmup failed: ${err.message}`); }
}

export function getEmbedderStatus() {
  return instance ? 'ready' : 'loading';
}
