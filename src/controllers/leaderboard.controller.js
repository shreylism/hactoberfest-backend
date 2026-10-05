const User = require('../models/user');

async function getRank(user) {
  const ahead = await User.countDocuments({
    status: 'active',
    $or: [
      { totalScore: { $gt: user.totalScore } },
      {
        totalScore: user.totalScore,
        lastScoreAt: { $lt: user.lastScoreAt },
      },
    ],
  });
  return ahead + 1;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getLeaderboard = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const search = (req.query.search || '').trim();
    if (search) {
     const matches = await User.find({
       status: 'active',
       totalScore: { $gt: 0 },
       username: { $regex: '^' + escapeRegex(search), $options: 'i' },
     }).sort({ totalScore: -1, lastScoreAt: 1 }).limit(10).select('username avatarUrl totalScore prCount lastScoreAt');

     const results = await Promise.all(matches.map(async (u) => ({
      rank: await getRank(u),
      username: u.username,
      avatarUrl: u.avatarUrl,
      totalScore: u.totalScore,
      prCount: u.prCount,
     })));

     return res.json({ users: results, page: 1, limit: 10, total: results.length });
    }

    const filter = { status: 'active', totalScore: { $gt: 0 } };

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ totalScore: -1, lastScoreAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('username avatarUrl totalScore prCount'),
      User.countDocuments(filter),
    ]);

    const result = users.map((u, i) => ({
      rank: (page - 1) * limit + i + 1,
      username: u.username,
      avatarUrl: u.avatarUrl,
      totalScore: u.totalScore,
      prCount: u.prCount,
    }));

    res.json({ users: result, page, limit, total });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.getMyRank = async (req, res) => {
  try {
    const u = req.user;
    if (u.totalScore === 0) {
      return res.json({
        username: u.username, rank: null, totalScore: 0, prCount: u.prCount,
      });
    }
    const rank = await getRank(u);
    res.json({
      username: u.username, rank, totalScore: u.totalScore, prCount: u.prCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.getRank = getRank;