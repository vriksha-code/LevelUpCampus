const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - auto-delete when expired
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
});

otpSchema.index({ email: 1 });

module.exports = mongoose.model("OTP", otpSchema);
