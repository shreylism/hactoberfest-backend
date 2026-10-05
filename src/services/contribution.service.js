const Contribution = require('../models/contribution');

exports.holdContribution = async (id) => {
  console.log('[placeholder] hold', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'valid' }, { status: 'flagged' });
};

exports.restoreContribution = async (id) => {
  console.log('[placeholder] restore', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'flagged' }, { status: 'valid' });
};

exports.rejectContribution = async (id) => {
  console.log('[placeholder] reject', String(id));
  await Contribution.findOneAndUpdate({ _id: id, status: 'flagged' }, { status: 'rejected' });
};