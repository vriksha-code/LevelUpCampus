const crypto = require("crypto");
const OTP = require("../models/OTP");

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_COOLDOWN_SECS  = parseInt(process.env.OTP_COOLDOWN_SECONDS) || 60;

/**
 * Generate a cryptographically secure 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create and store OTP for an email, respecting cooldown.
 * Returns the OTP string to be sent via email.
 */
const createOTP = async (email) => {
  const existing = await OTP.findOne({ email, isUsed: false });

  if (existing) {
    const elapsed = (Date.now() - new Date(existing.lastSentAt).getTime()) / 1000;
    if (elapsed < OTP_COOLDOWN_SECS) {
      const waitSeconds = Math.ceil(OTP_COOLDOWN_SECS - elapsed);
      throw Object.assign(new Error(`Please wait ${waitSeconds}s before requesting a new OTP.`), {
        statusCode: 429,
        waitSeconds,
      });
    }
    // Delete old OTP
    await OTP.deleteOne({ _id: existing._id });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({ email, otp, expiresAt, lastSentAt: new Date() });

  return otp;
};

/**
 * Verify OTP for a given email.
 */
const verifyOTP = async (email, otpInput) => {
  const record = await OTP.findOne({ email, isUsed: false });

  if (!record) {
    throw Object.assign(new Error("No OTP found. Please request a new one."), { statusCode: 400 });
  }

  if (new Date() > record.expiresAt) {
    await OTP.deleteOne({ _id: record._id });
    throw Object.assign(new Error("OTP has expired. Please request a new one."), { statusCode: 400 });
  }

  if (record.attempts >= 5) {
    await OTP.deleteOne({ _id: record._id });
    throw Object.assign(new Error("Too many failed attempts. Please request a new OTP."), { statusCode: 429 });
  }

  if (record.otp !== otpInput.trim()) {
    record.attempts += 1;
    await record.save();
    const remaining = 5 - record.attempts;
    throw Object.assign(
      new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`),
      { statusCode: 400 }
    );
  }

  // Mark as used
  record.isUsed = true;
  await record.save();

  return true;
};

module.exports = { createOTP, verifyOTP };
