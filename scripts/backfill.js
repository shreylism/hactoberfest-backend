require('dotenv').config();
const mongoose = require('mongoose');
const Repository = require('../src/models/repository');
const User = require('../src/models/user');
const { processPullRequest } = require('../src/services/contribution.service');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const repos = await Repository.find({ isActive: true });
  console.log('active repos:', repos.map(r => `${r.githubOwner}/${r.githubRepo}`));


  for (const repo of repos) {
    for (let page = 1; ; page++) {
      const res = await fetch(
        `https://api.github.com/repos/${repo.githubOwner}/${repo.githubRepo}/pulls?state=closed&per_page=100&page=${page}`,
        { headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'backfill',
            ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        } }
      );
      const prs = await res.json();
      console.log('page', page, 'status', res.status, 'count', Array.isArray(prs) ? prs.length : prs);
      if (!Array.isArray(prs) || prs.length === 0) break;

      for (const pr of prs) {
        if (!pr.merged_at) continue;               // only merged PRs
        const user = await User.findOne({ githubId: String(pr.user.id), status: 'active' });
        if (!user) { console.log('skip (no account):', pr.user.login, pr.number); continue; }
        try {
          await processPullRequest({ repository: repo, pullRequestNumber: pr.number, userId: user._id });
          console.log('ok:', pr.user.login, pr.number);
        } catch (e) {
          console.log('fail:', pr.number, e.message);
        }
      }
    }
  }
  await mongoose.disconnect();
}

main();