const User = require("../models/User");
const { ensureProgressShape } = require("../services/progress.service");

const getLevels = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("currentLevel levelTitle totalXP xp level levelHistory createdAt earnedBadges");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const changed = ensureProgressShape(user);
    if (changed) {
      await user.save();
    }

    const history = [...user.levelHistory].sort((a, b) => Number(a.level) - Number(b.level));
    const previousLevels = history.filter((entry) => Number(entry.level) < Number(user.currentLevel));
    const currentLevel = history.find((entry) => Number(entry.level) === Number(user.currentLevel)) || {
      level: user.currentLevel,
      title: user.levelTitle,
      date: user.updatedAt || user.createdAt || new Date(),
    };

    res.json({
      success: true,
      data: {
        current: {
          level: user.currentLevel,
          title: user.levelTitle,
          xp: user.totalXP,
          date: currentLevel.date,
        },
        levelHistory: history,
        previousLevels,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLevels };
