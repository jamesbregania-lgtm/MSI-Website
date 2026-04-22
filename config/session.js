const session = require('express-session');

module.exports = session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_change_me',
  proxy: true,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Use HTTPS-only cookies when the request is HTTPS (including trusted proxy setups).
    // This avoids auth redirect loops on local/LAN HTTP even if NODE_ENV=production.
    secure: 'auto',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
});