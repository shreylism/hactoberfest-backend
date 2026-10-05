const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function auth(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ 
        error: 'Not logged in' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ 
        error: 'Account banned' 
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ 
      error: 'Something went wrong' 
    });
  }
}

module.exports = auth;