const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
  processPullRequest,
  processWebhook,
  syncContributions,
  listMine,
  listForUsername,
} = require('../controllers/contribution.controller');
const { verifyWebhookSignature } = require('../services/github.service');

const router = express.Router();
const webhookRouter = express.Router();
const publicRouter = express.Router();

publicRouter.get('/users/:username/contributions', listForUsername);

webhookRouter.post(
  '/github',
  (req, res, next) => {
    if (!verifyWebhookSignature(req.body, req.header('x-hub-signature-256'))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    return next();
  },
  processWebhook
);

router.use(auth);
router.get('/', (req, res, next) => {
  if (req.query.mine !== 'true') {
    return res.status(400).json({ error: 'Use mine=true to list your contributions' });
  }
  return listMine(req, res, next);
});
router.post('/sync', syncContributions);
router.post('/repositories/:repositoryId/pulls/:number/process', processPullRequest);

module.exports = router;
module.exports.webhookRouter = webhookRouter;
module.exports.publicRouter = publicRouter;
