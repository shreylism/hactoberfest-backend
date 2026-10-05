const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repository' },
    githubPrId: { type: String, trim: true },
    githubPrNumber: { type: Number, min: 1 },
    githubUsername: { type: String, trim: true },
    githubUserId: { type: Number, min: 1 },
    title: { type: String, trim: true },
    url: { type: String, trim: true },
    state: { type: String, enum: ['open', 'closed'] },
    merged: { type: Boolean },
    additions: { type: Number, min: 0 },
    deletions: { type: Number, min: 0 },
    changedFiles: { type: Number, min: 0 },
    githubCreatedAt: { type: Date },
    githubMergedAt: { type: Date },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    scoringVersion: { type: String, default: 'v1', trim: true },
    status: { type: String, enum: ['valid', 'flagged', 'rejected'], default: 'valid' },
    reportCount: { type: Number, default: 0 },
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

contributionSchema.index(
  { repositoryId: 1, githubPrId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      repositoryId: { $exists: true },
      githubPrId: { $exists: true },
    },
  }
);

module.exports = mongoose.model('Contribution', contributionSchema);