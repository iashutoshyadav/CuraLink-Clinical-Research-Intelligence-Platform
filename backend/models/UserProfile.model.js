import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name:   { type: String, default: '' },

    conditions: { type: [String], default: [] },
    location:   { type: String, default: '' },

    savedPapers: [
      {
        doi:     String,
        title:   String,
        url:     String,
        savedAt: { type: Date, default: Date.now },
      },
    ],

    queryHistory: [
      {
        query:     String,
        disease:   String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    preferences: {
      preferRCTs:     { type: Boolean, default: false },
      technicalLevel: {
        type:    String,
        enum:    ['patient', 'clinician', 'researcher'],
        default: 'patient',
      },
    },
  },
  {
    timestamps: true,

  },
);

UserProfileSchema.pre('save', function (next) {
  if (this.queryHistory.length > 100) {
    this.queryHistory = this.queryHistory.slice(-100);
  }
  next();
});

export default mongoose.model('UserProfile', UserProfileSchema);
