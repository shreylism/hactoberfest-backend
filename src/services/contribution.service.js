const Contribution = require('../models/contribution');
const { getPullRequest } = require('./github.service');
const { calculatePrScore } = require('./scoring.service');
const User = require('../models/user');

exports.holdContribution = async (id) => {
  const old = await Contribution.findOneAndUpdate(
    { _id: id, status: 'valid' },
    { status: 'flagged' },
    { returnDocument: 'before' }
  );
  if (old && old.pointsAwarded > 0) {
    await User.updateOne(
      { _id: old.userId },
      { $inc: { totalScore: -old.pointsAwarded, prCount: -1 } }
    );
  }
};

exports.restoreContribution = async (id) => {
  const old = await Contribution.findOneAndUpdate(
    { _id: id, status: 'flagged' },
    { status: 'valid' },
    { returnDocument: 'before' }
  );
  if (old && old.pointsAwarded > 0) {
    await User.updateOne(
      { _id: old.userId },
      { $inc: { totalScore: old.pointsAwarded, prCount: 1 } }
    );
  }
};

exports.rejectContribution = async (id) => {
  await Contribution.findOneAndUpdate(
    { _id: id, status: 'flagged' },
    { status: 'rejected' }
  );
};


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

  const existing = await Contribution.findOne(filter);
  if (existing && existing.status !== 'valid') return existing;

  const oldPoints = existing ? existing.pointsAwarded : 0;
  const newPoints = score.score;

  const contribution = await Contribution.findOneAndUpdate(
    filter,
    {
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
        pointsAwarded: newPoints,
      },
      $setOnInsert: { status: 'valid', reportCount: 0 },
    },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const pointsDelta = newPoints - oldPoints;
  const prDelta = (newPoints > 0 ? 1 : 0) - (oldPoints > 0 ? 1 : 0);
  if (pointsDelta !== 0 || prDelta !== 0) {
    await User.updateOne(
      { _id: userId },
      {
        $inc: { totalScore: pointsDelta, prCount: prDelta },
        ...(pointsDelta > 0 ? { $set: { lastScoreAt: new Date() } } : {}),
      }
    );
  }

  return contribution;
};