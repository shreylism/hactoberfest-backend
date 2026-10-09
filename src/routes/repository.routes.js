const express = require('express');
const auth = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const controller = require('../controllers/repository.controller');

const router = express.Router();

router.get('/', controller.listActive);
router.use(auth, admin);
router.post('/', controller.create);
router.patch('/:repositoryId/scoring', controller.updateScoringConfig);
router.post('/:repositoryId/deactivate', controller.deactivate);

module.exports = router;
