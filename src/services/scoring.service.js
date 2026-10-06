const scoringVersion = process.env.SCORING_VERSION || 'v1';
const configuredBase = Number(process.env.SCORING_BASE || 0);
const configuredMergedBonus = Number(process.env.SCORING_MERGED_BONUS || 0);

exports.calculatePrScore = (pullRequest, repository) => {
  const repositoryConfig = repository.scoringConfig || {};
  const base = Number(repositoryConfig.base ?? configuredBase);
  const mergedBonus = pullRequest.merged
    ? Number(repositoryConfig.mergedBonus ?? configuredMergedBonus)
    : 0;
  const score = pullRequest.merged ? base + mergedBonus : 0;

  return {
    score,
    scoreBreakdown: { base: pullRequest.merged ? base : 0, mergedBonus },
    scoringVersion,
  };
};