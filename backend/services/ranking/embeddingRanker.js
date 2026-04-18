import { getEmbedder } from '../embeddings/embedder.js';
import logger from '../../utils/logger.js';

function cosineSimilarity(v1, v2) {
  let dotProd = 0;
  let normA   = 0;
  let normB   = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProd += v1[i] * v2[i];
    normA   += v1[i] ** 2;
    normB   += v2[i] ** 2;
  }

  return dotProd / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export async function rankByEmbeddings(publications, query) {
  if (!publications.length || !query) return publications;

  try {
    const embedder = await getEmbedder();

    logger.debug('Embedding query...');
    const qEmbed = await embedder(query, { pooling: 'mean', normalize: true });
    const qVec   = Array.from(qEmbed.data);

    const textsToEmbed = publications.map((p) => `${p.title} ${(p.abstract || '').slice(0, 300)}`);

    logger.debug(`Embedding batch of ${textsToEmbed.length} publications...`);
    const pEmbeds = await embedder(textsToEmbed, { pooling: 'mean', normalize: true });

    const vecSize = qVec.length;
    const pData   = pEmbeds.data;

    publications.forEach((pub, i) => {
      const pVec = Array.from(pData.slice(i * vecSize, (i + 1) * vecSize));
      const sim  = cosineSimilarity(qVec, pVec);

      pub.embeddingScore = Math.max(0, (sim + 1) / 2);
    });

  } catch (err) {
    logger.error(`Embedding ranking failed: ${err.message}`);

    publications.forEach((p) => { p.embeddingScore = 0; });
  }

  return publications;
}
