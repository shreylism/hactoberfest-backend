const mongoose = require('mongoose');
const Contribution = require('../models/contribution');
const Report = require('../models/report');
const User = require('../models/user');
const AuditLog = require('../models/auditLog');
const {
  restoreContribution,
  rejectContribution: rejectService,
} = require('../services/contribution.service');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.getFlagged = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

    const filter = { status: 'flagged' };
    const [contributions, total] = await Promise.all([
      Contribution.find(filter)
        .sort({ reportCount: -1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'username strikes totalScore')
        .lean(),
      Contribution.countDocuments(filter),
    ]);

    const ids = contributions.map((c) => c._id);
    const reports = await Report.find({ contributionId: { $in: ids }, status: 'open' })
      .populate('reporterId', 'username')
      .select('contributionId reporterId reason description createdAt')
      .lean();

    const items = contributions.map((c) => ({
      ...c,
      reports: reports.filter((r) => String(r.contributionId) === String(c._id)),
    }));

    res.json({ items, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.rejectContribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });

    const contribution = await Contribution.findById(id);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status !== 'flagged') {
      return res.status(400).json({ error: 'Only flagged contributions can be rejected' });
    }

    await rejectService(id);

    const owner = await User.findByIdAndUpdate(
      contribution.userId,
      { $inc: { strikes: 1 } },
      { returnDocument: 'after' }
    );

    await Report.updateMany(
      { contributionId: id, status: 'open' },
      { status: 'upheld', reviewedBy: req.user._id, reviewedAt: new Date() }
    );

    await AuditLog.create({
      adminId: req.user._id, action: 'reject',
      targetType: 'contribution', targetId: id, reason,
    });

    res.json({
      message: 'Contribution rejected',
      strikes: owner.strikes,
      suggestBan: owner.strikes >= 3,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.dismissContribution = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });

    const contribution = await Contribution.findById(id);
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status !== 'flagged') {
      return res.status(400).json({ error: 'Only flagged contributions can be dismissed' });
    }

    await restoreContribution(id);

    await Contribution.findByIdAndUpdate(id, { reportCount: 0 });

    const openReports = await Report.find({ contributionId: id, status: 'open' }).select('reporterId');
    const reporterIds = openReports.map((r) => r.reporterId);

    await Report.updateMany(
      { contributionId: id, status: 'open' },
      { status: 'dismissed', reviewedBy: req.user._id, reviewedAt: new Date() }
    );
    await User.updateMany({ _id: { $in: reporterIds } }, { $inc: { falseReportCount: 1 } });

    await AuditLog.create({
      adminId: req.user._id, action: 'dismiss',
      targetType: 'contribution', targetId: id, reason: req.body?.reason,
    });

    res.json({ message: 'Reports dismissed, contribution restored' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });
    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    const user = await User.findByIdAndUpdate(id, { status: 'banned' }, { returnDocument: 'after' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.create({
      adminId: req.user._id, action: 'ban', targetType: 'user', targetId: id, reason,
    });
    res.json({ message: `${user.username} banned` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'Invalid id' });

    const user = await User.findByIdAndUpdate(id, { status: 'active' }, { returnDocument: 'after' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await AuditLog.create({
      adminId: req.user._id, action: 'unban', targetType: 'user', targetId: id, reason: req.body?.reason,
    });
    res.json({ message: `${user.username} unbanned` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? { username: { $regex: escaped, $options: 'i' } } : {};

    const users = await User.find(filter)
      .limit(20)
      .select('username avatarUrl totalScore strikes falseReportCount status role');
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};