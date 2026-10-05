const express = require('express');
const auth = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const c = require('../controllers/admin.controller');

const router = express.Router();

router.use(auth, admin);

router.get('/flagged', c.getFlagged);
router.post('/contributions/:id/reject', c.rejectContribution);
router.post('/contributions/:id/dismiss', c.dismissContribution);
router.get('/users', c.searchUsers);
router.post('/users/:id/ban', c.banUser);
router.post('/users/:id/unban', c.unbanUser);

module.exports = router;