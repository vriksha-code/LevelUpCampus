const { awardXP } = require("../services/xp.service");
const User = require("../models/User");

/**
 * POST /api/xp/add
 * Add XP to the authenticated user
 */
const addXP = async (req, res, next) => {
  try {
    const { amount, source, description } = req.body;

    const result = await awardXP(req.user._id, amount, source, description);

    res.json({
      success: true,
      message: result.leveledUp
        ? `🎉 Level up! You're now level ${result.currentLevel} — ${result.levelTitle}!`
        : `+${amount} XP awarded!`,
      data: {
        xpAwarded:      result.xpAwarded,
        totalXP:        result.totalXP,
        currentLevel:   result.currentLevel,
        levelTitle:     result.levelTitle,
        currentXP:      result.currentXP,
        requiredXP:     result.requiredXP,
        progressPercent: result.progressPercent,
        leveledUp:      result.leveledUp,
        previousLevel:  result.previousLevel,
        nextLevel:      result.nextLevel,
        upcomingLevels: result.upcomingLevels,
        newlyEarned:    result.newlyEarned,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/xp/history
 * Returns XP history for current user (paginated)
 */
const getXPHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const user = await User.findById(req.user._id).select("xpHistory totalXP");
    const sorted  = [...user.xpHistory].sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
    const total   = sorted.length;
    const history = sorted.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        history,
        totalXP: user.totalXP,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addXP, getXPHistory };
