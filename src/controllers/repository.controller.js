const Repository = require('../models/repository');

exports.listActive = async (req, res) => {
  const repositories = await Repository.find({ isActive: true }).sort({ githubOwner: 1, githubRepo: 1 }).lean();
  return res.json({ repositories });
};

exports.create = async (req, res) => {
  try {
    const { githubOwner, githubRepo, githubRepoId, url, scoringConfig } = req.body;
    if (
      typeof githubOwner !== 'string'
      || typeof githubRepo !== 'string'
      || !Number.isInteger(githubRepoId)
      || typeof url !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid repository details' });
    }

    const repository = await Repository.create({
      githubOwner: githubOwner.trim(),
      githubRepo: githubRepo.trim(),
      githubRepoId,
      url: url.trim(),
      scoringConfig,
    });
    return res.status(201).json(repository);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Repository already registered' });
    throw err;
  }
};

exports.updateScoringConfig = async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const { base, mergedBonus } = req.body || {};

    if (!Number.isFinite(Number(base)) || !Number.isFinite(Number(mergedBonus))) {
      return res.status(400).json({
        error: 'base and mergedBonus must be numbers',
      });
    }

    const repository = await Repository.findByIdAndUpdate(
      repositoryId,
      {
        scoringConfig: {
          base: Number(base),
          mergedBonus: Number(mergedBonus),
        },
      },
      { new: true, runValidators: true }
    );

    if (!repository) {
      return res.status(404).json({
        error: 'Repository not found',
      });
    }

    return res.json(repository);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
};

exports.deactivate = async (req, res) => {
  const repository = await Repository.findByIdAndUpdate(
    req.params.repositoryId,
    { isActive: false },
    { new: true }
  );
  if (!repository) return res.status(404).json({ error: 'Repository not found' });
  return res.json(repository);
};
