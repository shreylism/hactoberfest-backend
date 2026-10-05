const Contribution = require('../models/contribution');
const User = require('../models/user');
const { getPullRequest } = require('./github.service');
const { calculatePrScore } = require('./scoring.service');

exports.holdContribution = async (id) => {
  const contribution = await Contribution.findOneAndUpdate(
    { _id: id, status: 'valid' },
    { status: 'flagged' },
    { new: true }
  );
  if (!contribution) return null;
  await User.findByIdAndUpdate(contribution.userId, {
    $inc: {
      totalScore: -contribution.pointsAwarded,
      prCount: contribution.pointsAwarded > 0 ? -1 : 0,
    },
  });
  return contribution;
};

exports.restoreContribution = async (id) => {
  const contribution = await Contribution.findOneAndUpdate(
    { _id: id, status: 'flagged' },
    { status: 'valid' },
    { new: true }
  );
  if (!contribution) return null;
  await User.findByIdAndUpdate(contribution.userId, {
    $inc: {
      totalScore: contribution.pointsAwarded,
      prCount: contribution.pointsAwarded > 0 ? 1 : 0,
    },
    $set: { lastScoreAt: new Date() },
  });
  return contribution;
};

exports.rejectContribution = async (id) => {
  return Contribution.findOneAndUpdate(
    { _id: id, status: 'flagged' },
    { status: 'rejected' },
    { new: true }
  );
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
  if (!isWithinEventWindow(pullRequest)) {
    throw new Error('Pull request is outside the event window');
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
      githubCreatedAt: pullRequest.created_at,
      githubMergedAt: pullRequest.merged_at,
      scoreBreakdown: score.scoreBreakdown,
      scoringVersion: score.scoringVersion,
    },
    $setOnInsert: {
      status: 'valid',
      reportCount: 0,
    },
  };

  const existing = await Contribution.findOne(filter).select('status pointsAwarded');
  if (existing && existing.status !== 'valid') {
    delete update.$set.pointsAwarded;
  } else {
    update.$set.pointsAwarded = score.score;
  }
  const contribution = await Contribution.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  if (!existing) {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        totalScore: score.score,
        prCount: score.score > 0 ? 1 : 0,
      },
      $set: { lastScoreAt: new Date() },
    });
  } else if (existing.status === 'valid') {
    const difference = score.score - existing.pointsAwarded;
    const prCountDifference = Number(score.score > 0) - Number(existing.pointsAwarded > 0);
    if (difference !== 0 || prCountDifference !== 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: {
          totalScore: difference,
          prCount: prCountDifference,
        },
        $set: { lastScoreAt: new Date() },
      });
    }
  }
  return contribution;
};

function isWithinEventWindow(pullRequest) {
  const start = new Date(process.env.EVENT_START_DATE);
  const end = new Date(process.env.EVENT_END_DATE);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error('Event window is not configured correctly');
  }
  const createdAt = new Date(pullRequest.created_at);
  const mergedAt = pullRequest.merged_at ? new Date(pullRequest.merged_at) : null;
  return (createdAt >= start && createdAt <= end)
    || (mergedAt && mergedAt >= start && mergedAt <= end);
}

exports.isWithinEventWindow = isWithinEventWindow;