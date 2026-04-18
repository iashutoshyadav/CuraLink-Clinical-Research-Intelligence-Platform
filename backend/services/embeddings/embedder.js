import { pipeline } from '@xenova/transformers';
import logger from '../../utils/logger.js';

let embedderInstance = null;

export async function getEmbedder() {
  if (!embedderInstance) {

    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedderInstance;
}

export async function warmupEmbedder() {
  try {
    const embedder = await getEmbedder();
    await embedder('warmup query', { pooling: 'mean', normalize: true });
    logger.debug('Embedder warmed up successfully in background.');
  } catch (err) {
    logger.error(`Embedder warmup failed: ${err.message}`);
  }
}

export function getEmbedderStatus() {
  return embedderInstance ? 'ready' : 'loading';
}
