import mongoose from 'mongoose';
import crypto from 'crypto';

const CacheSchema = new mongoose.Schema(
  {
    queryHash: { type: String, required: true, unique: true, index: true },
    queryMeta: {
      disease:  String,
      query:    String,
      location: String,
    },
    publications: { type: Array, default: [] },
    trials:       { type: Array, default: [] },
    createdAt:    { type: Date, default: Date.now, expires: 86_400 },
  },
  { timestamps: false },
);

CacheSchema.statics.buildKey = function ({ disease = '', query = '', location = '' }) {
  const normalized = [disease, query, location]
    .map((s) => s.toLowerCase().trim())
    .join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

export default mongoose.model('Cache', CacheSchema);
