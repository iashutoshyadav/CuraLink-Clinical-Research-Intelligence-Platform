import logger from '../../utils/logger.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let embedderInstance = null;

export async function getEmbedder() {
  if (IS_PRODUCTION) return null;
  if (!embedderInstance) {
    const { pipeline } = await import('@xenova/transformers');
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
  }
  return embedderInstance;
}

export async function warmupEmbedder() {
  if (IS_PRODUCTION) return;
  try {
    const embedder = await getEmbedder();
    await embedder('warmup query', { pooling: 'mean', normalize: true });
    logger.debug('Embedder warmed up successfully in background.');
  } catch (err) {
    logger.error(`Embedder warmup failed: ${err.message}`);
  }
}

export function getEmbedderStatus() {
  if (IS_PRODUCTION) return 'disabled';
  return embedderInstance ? 'ready' : 'loading';
}
