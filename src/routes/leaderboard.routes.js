const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getLeaderboard, getMyRank } = require('../controllers/leaderboard.controller');

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/me', auth, getMyRank);

module.exports = router;