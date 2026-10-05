const User = require('../models/user');
const { getRank } = require('./leaderboard.controller');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username,
      status: 'active',
    }).select('username avatarUrl totalScore prCount lastScoreAt');

    if (!user) return res.status(404).json({ error: 'User not found' });

    const rank = user.totalScore > 0 ? await getRank(user) : null;

    res.json({
      username: user.username,
      avatarUrl: user.avatarUrl,
      rank,
      totalScore: user.totalScore,
      prCount: user.prCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};