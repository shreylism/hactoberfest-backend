const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
  processPullRequest,
  processWebhook,
} = require('../controllers/contribution.controller');
const { verifyWebhookSignature } = require('../services/github.service');

const router = express.Router();
const webhookRouter = express.Router();

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
router.post('/repositories/:repositoryId/pulls/:number/process', processPullRequest);

module.exports = router;
module.exports.webhookRouter = webhookRouter;
