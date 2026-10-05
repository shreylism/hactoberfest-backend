const crypto = require('crypto');

async function githubRequest(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hactoberfest-backend',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }
  return response.json();
}

exports.getPullRequest = (owner, repo, number) => githubRequest(
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`
);

exports.listPullRequests = async (owner, repo, page = 1) => githubRequest(
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&per_page=100&page=${page}`
);

exports.verifyWebhookSignature = (payload, signature) => {
  if (!process.env.GITHUB_WEBHOOK_SECRET || !signature?.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};
