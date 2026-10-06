const express = require('express');
const passport = require('passport');
const auth = require('../middleware/auth.middleware');
const { githubCallback, me, logout } = require('../controllers/auth.controller');

const router = express.Router();

router.get('/github', passport.authenticate('github', { session: false }));

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: process.env.FRONTEND_URL,
  }),
  githubCallback
);

router.get('/me', auth, me);
router.post('/logout', logout);

module.exports = router;