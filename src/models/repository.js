const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    githubOwner: { type: String, required: true, trim: true },
    githubRepo: { type: String, required: true, trim: true },
    githubRepoId: { type: Number, required: true, unique: true },
    url: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    scoringConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

repositorySchema.index({ githubOwner: 1, githubRepo: 1 }, { unique: true });
repositorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Repository', repositorySchema);
