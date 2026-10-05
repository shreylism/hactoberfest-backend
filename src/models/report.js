const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contributionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribution', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['spam', 'trivial', 'duplicate', 'plagiarism', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    status: { type: String, enum: ['open', 'upheld', 'dismissed'], default: 'open' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, contributionId: 1 }, { unique: true });
reportSchema.index({ status: 1 });
reportSchema.index({ contributionId: 1 });

module.exports = mongoose.model('Report', reportSchema);