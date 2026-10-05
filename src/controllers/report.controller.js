const Report = require('../models/report');
const Contribution = require('../models/contribution');
const { holdContribution } = require('../services/contribution.service');

const MAX_REPORTS_PER_DAY = 10;
const MAX_FALSE_REPORTS = 5;
const FLAG_THRESHOLD = 3;

exports.createReport = async (req, res) => {
  try {
    const { contributionId, reason, description } = req.body;
    const reporter = req.user;

    const contribution = await Contribution.findById(contributionId);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });

    if (String(contribution.userId) === String(reporter._id)) {
      return res.status(400).json({ error: 'You cannot report your own contribution' });
    }

    if (contribution.status === 'rejected') {
      return res.status(400).json({ error: 'This contribution is already rejected' });
    }

    if (reporter.falseReportCount >= MAX_FALSE_REPORTS) {
      return res.status(403).json({ error: 'You can no longer submit reports' });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await Report.countDocuments({
      reporterId: reporter._id,
      createdAt: { $gte: since },
    });
    if (todayCount >= MAX_REPORTS_PER_DAY) {
      return res.status(429).json({ error: 'Daily report limit reached' });
    }

    try {
      await Report.create({
        reporterId: reporter._id,
        contributionId: contribution._id,
        reportedUserId: contribution.userId,
        reason,
        description,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'You already reported this' });
      }
      throw err;
    }

    const updated = await Contribution.findByIdAndUpdate(
      contribution._id,
      { $inc: { reportCount: 1 } },
      { new: true }
    );

    if (updated.reportCount >= FLAG_THRESHOLD && updated.status === 'valid') {
      await holdContribution(updated._id);
    }

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.myReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })
      .select('contributionId reason status createdAt');
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};