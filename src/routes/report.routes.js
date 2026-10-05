const express = require('express');
const { z } = require('zod');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createReport, myReports } = require('../controllers/report.controller');

const router = express.Router();

const createReportSchema = z.object({
  contributionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid contribution id'),
  reason: z.enum(['spam', 'trivial', 'duplicate', 'plagiarism', 'other'], {
    message: 'Invalid reason',
  }),
  description: z.string().max(500, 'Description too long').optional(),
});

router.post('/', auth, validate(createReportSchema), createReport);
router.get('/mine', auth, myReports);

module.exports = router;