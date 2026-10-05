require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await User.deleteMany({ username: /^fake_/ });
  console.log(`Deleted ${result.deletedCount} fake users`);
  await mongoose.disconnect();
}

cleanup().catch((err) => {
  console.error(err.message);
  process.exit(1);
});