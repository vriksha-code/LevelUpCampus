const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const xpHistorySchema = new mongoose.Schema({
  amount:      { type: Number, required: true },
  source:      { type: String, required: true }, // "task", "badge", "streak", "community"
  description: { type: String },
  earnedAt:    { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    collegeEmail: {
      type: String,
      required: [true, "College email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    avatar: {
      type: String,
      default: function () {
        // Default DiceBear avatar based on name
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.name}`;
      },
    },
    major: {
      type: String,
      default: "Computer Science & HCI",
      trim: true,
      maxlength: [120, "Major cannot exceed 120 characters"],
    },
    bio: {
      type: String,
      default: "Senior student focused on gamifying education.",
      trim: true,
      maxlength: [280, "Bio cannot exceed 280 characters"],
    },
    publicProfile: {
      type: Boolean,
      default: true,
    },
    showRank: {
      type: Boolean,
      default: true,
    },
    incognitoMode: {
      type: Boolean,
      default: false,
    },

    // ─── Progress Tracking ───────────────────────────────────────────────────
    xp:      { type: Number, default: 0, min: 0 },
    level:   { type: Number, default: 1, min: 1 },

    // ─── Level & XP ──────────────────────────────────────────────────────────
    currentLevel:    { type: Number, default: 1, min: 1 },
    levelTitle:      { type: String, default: "Freshman" },
    totalXP:         { type: Number, default: 0, min: 0 },
    currentXP:       { type: Number, default: 0, min: 0 },   // XP within current level
    requiredXP:      { type: Number, default: 100 },          // XP needed for next level
    progressPercent:  { type: Number, default: 0, min: 0, max: 100 },
    xpHistory:       [xpHistorySchema],

    // ─── Streak ──────────────────────────────────────────────────────────────
    dailyStreak:     { type: Number, default: 0, min: 0 },
    longestStreak:   { type: Number, default: 0, min: 0 },
    lastActiveDate:  { type: Date, default: null },

    // ─── Badges & Achievements ───────────────────────────────────────────────
    earnedBadges: [
      {
        badge:    { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    badges: [
      {
        badge:    { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    levelHistory: [
      {
        level: { type: Number, required: true, min: 1 },
        title: { type: String, default: "" },
        date:  { type: Date, default: Date.now },
      },
    ],
    achievements: [
      {
        achievement: { type: mongoose.Schema.Types.ObjectId, ref: "Achievement" },
        earnedAt:    { type: Date, default: Date.now },
      },
    ],

    // ─── Rank ─────────────────────────────────────────────────────────────────
    rank: { type: Number, default: 0 },

    // ─── Community stats ──────────────────────────────────────────────────────
    postsCount:    { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    upvotesReceived: { type: Number, default: 0 },
    answersCount: { type: Number, default: 0 },

    notifications: [
      {
        type: {
          type: String,
          enum: ["reply", "accepted_answer", "xp", "system"],
          default: "system",
        },
        message: { type: String, required: true },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ─── Auth ─────────────────────────────────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    password:   { type: String, select: false }, // optional, for future use
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ totalXP: -1 });
userSchema.index({ dailyStreak: -1 });
userSchema.index({ currentLevel: -1 });
userSchema.index({ collegeEmail: 1 }, { unique: true });

// ─── Password hashing (future-proofing) ───────────────────────────────────────
userSchema.pre("save", async function (next) {
  this.xp = this.totalXP;
  this.level = this.currentLevel;

  if (!Array.isArray(this.earnedBadges)) {
    this.earnedBadges = [];
  }
  if (!Array.isArray(this.badges)) {
    this.badges = [];
  }
  if (this.earnedBadges.length === 0 && this.badges.length > 0) {
    this.earnedBadges = [...this.badges];
  }
  if (this.badges.length === 0 && this.earnedBadges.length > 0) {
    this.badges = [...this.earnedBadges];
  }
  if (!Array.isArray(this.levelHistory)) {
    this.levelHistory = [];
  }

  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
