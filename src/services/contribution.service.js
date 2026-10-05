const Contribution = require('../models/contribution');
const { getPullRequest } = require('./github.service');
const { calculatePrScore } = require('./scoring.service');

exports.holdContribution = async (id) => {
  console.log('[placeholder] hold', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'valid' }, { status: 'flagged' });
};

exports.restoreContribution = async (id) => {
  console.log('[placeholder] restore', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'flagged' }, { status: 'valid' });
};

exports.rejectContribution = async (id) => {
  console.log('[placeholder] reject', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'flagged' }, { status: 'rejected' });
};

/**
 * Fetches authoritative GitHub data, calculates the score on the server, and
 * upserts one contribution per repository/PR pair.
 */
exports.processPullRequest = async ({ repository, pullRequestNumber, userId, githubId }) => {
  if (!repository || !repository._id) {
    throw new Error('Repository is required');
  }
  if (!repository.isActive) {
    throw new Error('Repository is inactive');
  }
  if (!userId) {
    throw new Error('Authenticated user is required');
  }
  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error('Invalid pull request number');
  }

  const pullRequest = await getPullRequest(
    repository.githubOwner,
    repository.githubRepo,
    pullRequestNumber
  );
  if (githubId && String(githubId) !== String(pullRequest.user.id)) {
    throw new Error('Authenticated user does not own this pull request');
  }
  const score = calculatePrScore(pullRequest, repository);
  const filter = {
    repositoryId: repository._id,
    githubPrId: String(pullRequest.id),
  };
  const update = {
    $set: {
      userId,
      repositoryId: repository._id,
      githubPrId: String(pullRequest.id),
      githubPrNumber: pullRequest.number,
      githubUsername: pullRequest.user.login,
      githubUserId: pullRequest.user.id,
      title: pullRequest.title,
      url: pullRequest.html_url,
      state: pullRequest.state,
      merged: pullRequest.merged,
      additions: pullRequest.additions,
      deletions: pullRequest.deletions,
      changedFiles: pullRequest.changed_files,
      scoreBreakdown: score.scoreBreakdown,
      scoringVersion: score.scoringVersion,
      pointsAwarded: score.score,
    },
    $setOnInsert: {
      status: 'valid',
      reportCount: 0,
    },
  };

  return Contribution.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
};