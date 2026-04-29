const User = require("../models/User");
const { getLevelFromXP } = require("../config/levels");
const { ensureProgressShape } = require("../services/progress.service");
const { updateStreak } = require("../services/xp.service");

/**
 * GET /api/dashboard
 * Returns full dashboard data for logged-in user
 */
const getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("earnedBadges.badge",        "name description icon category rarity xpReward")
      .populate("achievements.achievement", "name description icon category xpReward")
      .select("-xpHistory");

    const progressChanged = ensureProgressShape(user);
    if (progressChanged) {
      await user.save();
    }

    // Update streak on dashboard visit
    const streakInfo = await updateStreak(user._id);

    // Recompute level info from totalXP (source of truth)
    const levelInfo = getLevelFromXP(user.totalXP);

    // Recent achievements (last 5)
    const recentAchievements = [...user.achievements]
      .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
      .slice(0, 5);

    // Rank summary (position by totalXP)
    const rank = await User.countDocuments({ totalXP: { $gt: user.totalXP } });
    const totalUsers = await User.countDocuments({ isVerified: true });

    res.json({
      success: true,
      data: {
        profile: {
          id:           user._id,
          name:         user.name,
          collegeEmail: user.collegeEmail,
          avatar:       user.avatar,
          createdAt:    user.createdAt,
        },
        level: {
          current:         levelInfo.currentLevel,
          title:           levelInfo.levelTitle,
          totalXP:         user.totalXP,
          currentXP:       levelInfo.currentXP,
          requiredXP:      levelInfo.requiredXP,
          progressPercent: levelInfo.progressPercent,
          nextLevel:       levelInfo.nextLevel,
          upcomingLevels:  levelInfo.upcomingLevels,
          isMaxLevel:      levelInfo.isMaxLevel,
        },
        streak: {
          current:       streakInfo.dailyStreak,
          longest:       user.longestStreak,
          lastActiveDate: user.lastActiveDate,
        },
        rank: {
          position:   rank + 1,
          totalUsers,
          percentile: totalUsers > 1
            ? Math.round(((totalUsers - rank) / totalUsers) * 100)
            : 100,
        },
        badges:              user.earnedBadges,
        earnedBadges:        user.earnedBadges,
        levelHistory:        user.levelHistory,
        recentAchievements,
        communityStats: {
          posts:           user.postsCount,
          comments:        user.commentsCount,
          upvotesReceived: user.upvotesReceived,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };
