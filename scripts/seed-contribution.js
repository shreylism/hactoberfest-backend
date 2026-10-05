require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Contribution = require('../src/models/contribution');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const owner = await User.findOne({ username: 'fake_user1' });
  const c = await Contribution.create({
    userId: owner._id, title: 'Test PR', pointsAwarded: 10,
  });
  console.log('Contribution id:', String(c._id));
  const reporters = await User.find({ username: /^fake_user[2-5]$/ }).select('_id username');
  reporters.forEach((u) => console.log(u.username, String(u._id)));
  await mongoose.disconnect();
})();