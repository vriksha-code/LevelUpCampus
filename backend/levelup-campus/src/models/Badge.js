const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true, // emoji or URL
    },
    category: {
      type: String,
      enum: ["streak", "xp", "level", "community", "leaderboard", "special"],
      required: true,
    },
    unlockCondition: {
      type: {
        type: String,
        enum: ["streak", "totalXP", "level", "posts", "rank", "upvotesReceived"],
        required: true,
      },
      value: { type: Number, required: true },
    },
    xpReward: {
      type: Number,
      default: 0,
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Badge", badgeSchema);
