const express = require("express");
const router  = express.Router();

const { sendOTP, verifyOTPAndLogin, getMe, updateMe } = require("../controllers/auth.controller");
const { validateCollegeEmail }              = require("../middleware/emailDomain.middleware");
const { validateSendOTP, validateVerifyOTP } = require("../middleware/validate.middleware");
const { otpRateLimiter }                    = require("../middleware/rateLimiter.middleware");
const { protect }                           = require("../middleware/auth.middleware");

// POST /api/auth/send-otp
router.post("/send-otp",
  otpRateLimiter,
  validateSendOTP,
  validateCollegeEmail,
  sendOTP
);

// POST /api/auth/verify-otp
router.post("/verify-otp",
  validateVerifyOTP,
  validateCollegeEmail,
  verifyOTPAndLogin
);

// GET /api/auth/me
router.get("/me", protect, getMe);

// PATCH /api/auth/me
router.patch("/me", protect, updateMe);

module.exports = router;
