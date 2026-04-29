const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
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
    icon:     { type: String, required: true },
    category: {
      type: String,
      enum: ["milestone", "streak", "community", "learning", "special"],
      required: true,
    },
    unlockCondition: {
      type: {
        type: String,
        enum: ["totalXP", "level", "streak", "posts", "badges"],
        required: true,
      },
      value: { type: Number, required: true },
    },
    xpReward: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Achievement", achievementSchema);
