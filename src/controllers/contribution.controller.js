const mongoose = require('mongoose');
const Repository = require('../models/repository');
const User = require('../models/user');
const { processPullRequest } = require('../services/contribution.service');

exports.processPullRequest = async (req, res) => {
  try {
    const { repositoryId, number } = req.params;
    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({ error: 'Invalid repository id' });
    }

    const pullRequestNumber = Number(number);
    if (!Number.isInteger(pullRequestNumber) || pullRequestNumber < 1) {
      return res.status(400).json({ error: 'Invalid pull request number' });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      isActive: true,
    });
    if (!repository) return res.status(404).json({ error: 'Repository not found' });

    const contribution = await processPullRequest({
      repository,
      pullRequestNumber,
      userId: req.user._id,
      githubId: req.user.githubId,
    });
    return res.json(contribution);
  } catch (err) {
    console.error(err);
    if (err.message === 'Authenticated user does not own this pull request') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(502).json({ error: 'Unable to process pull request' });
  }
};

exports.processWebhook = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString('utf8'));
    const actions = ['opened', 'reopened', 'synchronize', 'closed'];
    const repositoryPayload = payload.repository;
    const pullRequestNumber = payload.number;

    if (
      !actions.includes(payload.action)
      || !Number.isInteger(pullRequestNumber)
      || pullRequestNumber < 1
      || !repositoryPayload
      || !Number.isInteger(repositoryPayload.id)
    ) {
      return res.status(202).json({ ignored: true });
    }

    const repository = await Repository.findOne({
      githubRepoId: repositoryPayload.id,
      isActive: true,
    });
    if (!repository) return res.status(404).json({ error: 'Repository not registered' });

    const user = await User.findOne({
      githubId: String(payload.pull_request?.user?.id),
      status: 'active',
    });
    if (!user) return res.status(202).json({ ignored: true });

    await processPullRequest({
      repository,
      pullRequestNumber,
      userId: user._id,
    });
    return res.status(202).json({ processed: true });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
};
