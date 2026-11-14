const rateLimit = require('express-rate-limit');

// General limiter for submissions (grievances, votes, upvotes)
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per window per IP
  message: { error: 'Too many requests. Please try again later.' },
});

// Stricter limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per window per IP
  message: { error: 'Too many login attempts. Please try again later.' },
});

module.exports = { submissionLimiter, loginLimiter };