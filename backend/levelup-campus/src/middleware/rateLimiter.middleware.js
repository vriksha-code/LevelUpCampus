const { rateLimit } = require("express-rate-limit");

// Strict rate limit for OTP sending: 3 per 15 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip + ":" + (req.body.email || ""),
  message: {
    success: false,
    message: "Too many OTP requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, message: "Too many requests. Please slow down." },
});

module.exports = { otpRateLimiter, apiRateLimiter };
