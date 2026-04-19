import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRoutes from './routes/chat.routes.js';
import sessionRoutes from './routes/session.routes.js';
import evalRoutes from './routes/eval.routes.js';
import logger from './utils/logger.js';
const { warmupEmbedder, getEmbedderStatus } = await import('./services/embeddings/embedder.js');
const { warmUpCrossEncoder, getCrossEncoderStatus } = await import('./services/ranking/crossEncoderReranker.js');
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

app.use('/api/', rateLimiter);

app.use((_req, res, next) => {
  res.setHeader('X-Powered-By', 'Curalink');
  next();
});

app.use('/api/chat', chatRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/eval', evalRoutes);

app.get('/api/health', async (_req, res) => {

  let ollamaStatus = 'unreachable';
  try {
    const r = await axios.get(`${process.env.OLLAMA_URL ?? 'http://localhost:11434'}/api/tags`, { timeout: 2000 });
    ollamaStatus = r.status === 200 ? 'ok' : 'error';
  } catch {  }

  res.json({
    status:    'ok',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    service:   'curalink-backend',
    models: {
      biEncoder:    getEmbedderStatus?.()    ?? 'unknown',
      crossEncoder: getCrossEncoderStatus?.() ?? 'unknown',
    },
    ollama:  ollamaStatus,
    hf:      process.env.HF_ENDPOINT_URL ? 'configured' : 'disabled',
  });
});

app.use(errorHandler);

async function bootstrap() {
  try {
    await connectDB();
    logger.info('✅ MongoDB connected');

    logger.info('🔥 Pre-warming ML models...');
    Promise.allSettled([
      warmupEmbedder(),
      warmUpCrossEncoder(),
    ]).then((results) => {
      results.forEach((r, i) => {
        const name = i === 0 ? 'Bi-encoder (MiniLM)' : 'Cross-encoder (ms-marco)';
        if (r.status === 'fulfilled') logger.info(`✅ ${name} ready`);
        else logger.warn(`⚠️  ${name} warm-up failed: ${r.reason?.message}`);
      });
    });

    app.listen(PORT, () => {
      logger.info(`🚀 Curalink backend running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error(`❌ Bootstrap failed: ${err.message}`);
    process.exit(1);
  }
}

bootstrap();

export default app;
