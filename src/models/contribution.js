const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    githubPrId: { type: String },
    title: { type: String },
    status: { type: String, enum: ['valid', 'flagged', 'rejected'], default: 'valid' },
    reportCount: { type: Number, default: 0 },
    pointsAwarded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contribution', contributionSchema);