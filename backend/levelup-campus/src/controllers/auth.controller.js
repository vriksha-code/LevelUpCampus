const User = require("../models/User");
const { createOTP, verifyOTP } = require("../services/otp.service");
const { sendOTPEmail } = require("../services/email.service");
const { generateToken } = require("../middleware/auth.middleware");
const { updateStreak } = require("../services/xp.service");
const { getLevelFromXP } = require("../config/levels");

/**
 * POST /api/auth/send-otp
 * Validates college email domain, generates & sends OTP
 */
const sendOTP = async (req, res, next) => {
  try {
    const { email, name } = req.body;

    const otp = await createOTP(email);
    await sendOTPEmail(email, otp, name || "Student");

    const response = {
      success: true,
      message: `OTP sent to ${email}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
      cooldownSeconds: parseInt(process.env.OTP_COOLDOWN_SECONDS) || 60,
    };

    if (process.env.NODE_ENV !== "production" && !(process.env.EMAIL_USER && process.env.EMAIL_PASS)) {
      response.devOtp = otp;
      response.message = `${response.message} [dev OTP: ${otp}]`;
    }

    res.status(200).json(response);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.waitSeconds && { waitSeconds: error.waitSeconds }),
      });
    }
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies OTP, creates user if new, returns JWT
 */
const verifyOTPAndLogin = async (req, res, next) => {
  try {
    const { email, otp, name } = req.body;
    const fallbackName = email?.split("@")[0]
      ?.replace(/[._-]+/g, " ")
      ?.replace(/\b\w/g, (character) => character.toUpperCase())
      ?.trim();

    // Verify the OTP
    await verifyOTP(email, otp);

    // Check if user already exists
    let user = await User.findOne({ collegeEmail: email });
    let isNewUser = false;

    if (!user) {
      // Create new user
      const levelInfo = getLevelFromXP(0);
      user = await User.create({
        name: name || fallbackName || "Student",
        collegeEmail: email,
        isVerified: true,
        currentLevel: levelInfo.currentLevel,
        levelTitle:   levelInfo.levelTitle,
        currentXP:    0,
        totalXP:      0,
        requiredXP:   levelInfo.requiredXP,
        progressPercent: 0,
      });
      isNewUser = true;
    } else {
      user.isVerified = true;
      await user.save();
    }

    // Update daily streak on login
    const streakInfo = await updateStreak(user._id);

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: isNewUser ? "Account created successfully! Welcome to LevelUp Campus 🎮" : "Login successful!",
      isNewUser,
      token,
      user: {
        id:           user._id,
        name:         user.name,
        collegeEmail: user.collegeEmail,
        avatar:       user.avatar,
        currentLevel: user.currentLevel,
        levelTitle:   user.levelTitle,
        totalXP:      user.totalXP,
        dailyStreak:  streakInfo.dailyStreak,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns current user profile
 */
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateMe = async (req, res, next) => {
  try {
    const allowedFields = ["name", "major", "bio", "publicProfile", "showRank", "incognitoMode"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.name !== undefined) {
      updates.name = String(updates.name).trim();
    }

    if (updates.major !== undefined) {
      updates.major = String(updates.major).trim();
    }

    if (updates.bio !== undefined) {
      updates.bio = String(updates.bio).trim();
    }

    if (updates.name && updates.name.length < 2) {
      return res.status(400).json({ success: false, message: "Display name must be at least 2 characters." });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    Object.assign(user, updates);

    if (updates.name && (!user.avatar || user.avatar.includes("dicebear.com"))) {
      user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        collegeEmail: user.collegeEmail,
        avatar: user.avatar,
        major: user.major,
        bio: user.bio,
        publicProfile: user.publicProfile,
        showRank: user.showRank,
        incognitoMode: user.incognitoMode,
        currentLevel: user.currentLevel,
        levelTitle: user.levelTitle,
        totalXP: user.totalXP,
        dailyStreak: user.dailyStreak,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOTP, verifyOTPAndLogin, getMe, updateMe };
