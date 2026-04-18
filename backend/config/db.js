import mongoose from 'mongoose';
import logger from '../utils/logger.js';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
export async function connectDB(retries = MAX_RETRIES) {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/curalink';
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });
  } catch (err) {
    if (retries > 0) {
      logger.warn(`MongoDB connection failed. Retrying in ${RETRY_DELAY_MS}ms... (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return connectDB(retries - 1);
    }
    throw new Error(`MongoDB connection failed after ${MAX_RETRIES} retries: ${err.message}`);
  }
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Reconnecting...');
  });
  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
  });
}
