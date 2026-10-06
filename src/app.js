const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('./config/passport');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use('/webhooks/github', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          clean(obj[key]);
        }
      }
    }
  };
  clean(req.body);
  clean(req.params);
  next();
});
app.use(cookieParser());
app.use(passport.initialize());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path === '/webhooks/github',
}));
app.use(rateLimit({windowMs: 15 * 60 * 1000,max: 100,skip: (req) => req.path.startsWith('/webhooks'),}));
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', require('./routes/auth.routes'));
app.use('/leaderboard', require('./routes/leaderboard.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/reports', require('./routes/report.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/repositories', require('./routes/repository.routes'));
app.use('/contributions', require('./routes/contribution.routes'));
app.use('/webhooks', require('./routes/contribution.routes').webhookRouter);
app.use('/', require('./routes/contribution.routes').publicRouter);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' && status === 500 ? 'Server error' : err.message,
  });
});

module.exports = app;