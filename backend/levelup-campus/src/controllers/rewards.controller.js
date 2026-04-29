const Badge = require("../models/Badge");
const Achievement = require("../models/Achievement");
const User = require("../models/User");
const { ensureProgressShape, getBadgeEntries } = require("../services/progress.service");

const syncRewardsForUser = async (userId) => {
  const user = await User.findById(userId)
    .populate("earnedBadges.badge", "name description icon category rarity xpReward")
    .populate("badges.badge", "name description icon category rarity xpReward")
    .populate("achievements.achievement", "name description icon category xpReward");

  if (!user) {
    throw new Error("User not found");
  }

  ensureProgressShape(user);

  const allBadges = await Badge.find({ isActive: true });
  let changed = false;

  for (const badge of allBadges) {
    const alreadyHas = getBadgeEntries(user).some((b) => b.badge.toString() === badge._id.toString());
    if (alreadyHas) continue;

    const { type, value } = badge.unlockCondition;
    let unlocked = false;
    if (type === "totalXP" && user.totalXP >= value) unlocked = true;
    if (type === "level" && user.currentLevel >= value) unlocked = true;
    if (type === "streak" && user.dailyStreak >= value) unlocked = true;
    if (type === "posts" && user.postsCount >= value) unlocked = true;
    if (type === "upvotesReceived" && user.upvotesReceived >= value) unlocked = true;

    if (!unlocked) continue;

    user.earnedBadges.push({ badge: badge._id, earnedAt: new Date() });
    if (badge.xpReward > 0) {
      user.totalXP += badge.xpReward;
      user.xp += badge.xpReward;
      user.xpHistory.push({ amount: badge.xpReward, source: "badge", description: `Earned badge: ${badge.name}`, earnedAt: new Date() });
    }
    changed = true;
  }

  const allAchievements = await Achievement.find({ isActive: true });
  for (const achievement of allAchievements) {
    const alreadyHas = user.achievements.some((a) => a.achievement.toString() === achievement._id.toString());
    if (alreadyHas) continue;

    const { type, value } = achievement.unlockCondition;
    let unlocked = false;
    if (type === "totalXP" && user.totalXP >= value) unlocked = true;
    if (type === "level" && user.currentLevel >= value) unlocked = true;
    if (type === "streak" && user.dailyStreak >= value) unlocked = true;
    if (type === "posts" && user.postsCount >= value) unlocked = true;
    if (type === "badges" && user.earnedBadges.length >= value) unlocked = true;

    if (!unlocked) continue;

    user.achievements.push({ achievement: achievement._id, earnedAt: new Date() });
    if (achievement.xpReward > 0) {
      user.totalXP += achievement.xpReward;
      user.xp += achievement.xpReward;
      user.xpHistory.push({ amount: achievement.xpReward, source: "achievement", description: `Earned: ${achievement.name}`, earnedAt: new Date() });
    }
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return user;
};

/**
 * GET /api/rewards
 * Summary of user's earned rewards
 */
const getRewardsSummary = async (req, res, next) => {
  try {
    const user = await syncRewardsForUser(req.user._id);

    const [allBadges, allAchievements] = await Promise.all([
      Badge.countDocuments({ isActive: true }),
      Achievement.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        earned: {
          badges:       user.earnedBadges.length,
          achievements: user.achievements.length,
        },
        total: {
          badges:       allBadges,
          achievements: allAchievements,
        },
        completionPercent: Math.round(
          ((user.earnedBadges.length + user.achievements.length) / Math.max(allBadges + allAchievements, 1)) * 100
        ),
        recentBadges: [...user.earnedBadges]
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
          .slice(0, 3),
        recentAchievements: [...user.achievements]
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
          .slice(0, 3),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rewards/badges
 * All badges with locked/unlocked status for current user
 */
const getBadges = async (req, res, next) => {
  try {
    const user = await syncRewardsForUser(req.user._id);
    const allBadges = await Badge.find({ isActive: true }).sort({ "unlockCondition.value": 1 });

    const earnedIds = new Set(user.earnedBadges.map((b) => b.badge.toString()));

    const badgesWithStatus = allBadges.map((badge) => {
      const isEarned = earnedIds.has(badge._id.toString());
      const earned   = user.earnedBadges.find((b) => b.badge.toString() === badge._id.toString());

      // Calculate progress towards this badge
      let progress = 0;
      const { type, value } = badge.unlockCondition;
      if (type === "totalXP")    progress = Math.min(100, Math.floor((user.totalXP    / value) * 100));
      if (type === "level")      progress = Math.min(100, Math.floor((user.currentLevel / value) * 100));
      if (type === "streak")     progress = Math.min(100, Math.floor((user.dailyStreak / value) * 100));

      return {
        ...badge.toObject(),
        isEarned,
        earnedAt: isEarned ? earned.earnedAt : null,
        progress: isEarned ? 100 : progress,
      };
    });

    res.json({
      success: true,
      data: {
        badges:  badgesWithStatus,
        earned:  badgesWithStatus.filter((b) => b.isEarned).length,
        total:   allBadges.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rewards/achievements
 * All achievements with locked/unlocked status
 */
const getAchievements = async (req, res, next) => {
  try {
    const user = await syncRewardsForUser(req.user._id);
    const allAchievements = await Achievement.find({ isActive: true }).sort({ "unlockCondition.value": 1 });

    const earnedIds = new Set(user.achievements.map((a) => a.achievement.toString()));

    const achievementsWithStatus = allAchievements.map((ach) => {
      const isEarned = earnedIds.has(ach._id.toString());
      const earned   = user.achievements.find((a) => a.achievement.toString() === ach._id.toString());

      let progress = 0;
      const { type, value } = ach.unlockCondition;
      if (type === "totalXP") progress = Math.min(100, Math.floor((user.totalXP    / value) * 100));
      if (type === "level")   progress = Math.min(100, Math.floor((user.currentLevel / value) * 100));
      if (type === "streak")  progress = Math.min(100, Math.floor((user.dailyStreak / value) * 100));
      if (type === "posts")   progress = Math.min(100, Math.floor((user.postsCount  / value) * 100));
      if (type === "badges")  progress = Math.min(100, Math.floor((user.earnedBadges.length / value) * 100));

      return {
        ...ach.toObject(),
        isEarned,
        earnedAt: isEarned ? earned.earnedAt : null,
        progress: isEarned ? 100 : progress,
      };
    });

    res.json({
      success: true,
      data: {
        achievements: achievementsWithStatus,
        earned: achievementsWithStatus.filter((a) => a.isEarned).length,
        total:  allAchievements.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRewardsSummary, getBadges, getAchievements };
