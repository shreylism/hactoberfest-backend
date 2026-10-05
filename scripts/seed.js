require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = [];
  for (let i = 1; i <= 30; i++) {
    users.push({
      githubId: `fake_${i}`,
      username: `fake_user${i}`,
      avatarUrl: `https://avatars.githubusercontent.com/u/${1000 + i}?v=4`,
      totalScore: Math.floor(Math.random() * 300) + 1,
      prCount: Math.floor(Math.random() * 20) + 1,
      lastScoreAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
    });
  }

  await User.insertMany(users);
  console.log('Seeded 30 fake users');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});