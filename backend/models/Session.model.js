import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: {
    publications: { type: Array, default: [] },
    trials:       { type: Array, default: [] },
  },
  confidence_score: { type: Number, default: null },
  validation:       { type: Object, default: null },
  metrics:          { type: Object, default: null },
  timestamp:        { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema(
  {
    sessionId:   { type: String, required: true, unique: true, index: true },
    patientName: { type: String, default: '' },
    disease:     { type: String, required: true },
    location:    { type: String, default: '' },
    messages:    [MessageSchema],
    lastActivity: { type: Date, default: Date.now, index: true },

    userId:              { type: String, default: null, index: true },

    conversationSummary: { type: String, default: null },
  },
  {
    timestamps: true,
    expireAfterSeconds: 604_800,
  },
);

SessionSchema.pre('save', function (next) {
  this.lastActivity = new Date();
  next();
});

SessionSchema.methods.appendMessage = async function (message) {
  return mongoose.model('Session').findByIdAndUpdate(
    this._id,
    { $push: { messages: message }, $set: { lastActivity: new Date() } },
    { new: true },
  );
};

export default mongoose.model('Session', SessionSchema);
