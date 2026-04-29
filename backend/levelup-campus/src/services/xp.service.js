const User = require("../models/User");
const Badge = require("../models/Badge");
const Achievement = require("../models/Achievement");
const { getLevelFromXP, STREAK_BADGES } = require("../config/levels");
const { addEarnedBadge, recordLevelProgress } = require("./progress.service");
const { sendBadgeEmail } = require("./email.service");

/**
 * Award XP to a user, handle level-ups and badge unlocks.
 * @returns {object} Updated level info + newly earned badges/achievements
 */
const awardXP = async (userId, amount, source, description = "") => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const previousTotalXP = user.totalXP;
  const newTotalXP = previousTotalXP + amount;

  // Compute new level info
  const levelInfo = getLevelFromXP(newTotalXP);

  const previousLevel = user.currentLevel;

  // Update user XP fields
  user.totalXP = newTotalXP;
  user.xp = newTotalXP;
  user.currentLevel = levelInfo.currentLevel;
  user.level = levelInfo.currentLevel;
  user.levelTitle = levelInfo.levelTitle;
  user.currentXP = levelInfo.currentXP;
  user.requiredXP = levelInfo.requiredXP;
  user.progressPercent = levelInfo.progressPercent;

  if (levelInfo.currentLevel > previousLevel) {
    recordLevelProgress(user, previousLevel, levelInfo.currentLevel, new Date());
  }

  // Log XP history
  user.xpHistory.push({ amount, source, description, earnedAt: new Date() });

  const newlyEarned = { badges: [], achievements: [] };
  const leveledUp = levelInfo.currentLevel > previousLevel;

  // Check badge/achievement unlocks
  const allBadges = await Badge.find({ isActive: true });
  for (const badge of allBadges) {
    const alreadyHas = user.earnedBadges.some((b) => b.badge.toString() === badge._id.toString());
    if (alreadyHas) continue;

    const { type, value } = badge.unlockCondition;
    let unlocked = false;
    if (type === "totalXP"         && newTotalXP >= value)        unlocked = true;
    if (type === "level"           && levelInfo.currentLevel >= value) unlocked = true;
    if (type === "streak"          && user.dailyStreak >= value)   unlocked = true;
    if (type === "posts"           && user.postsCount >= value)    unlocked = true;
    if (type === "upvotesReceived" && user.upvotesReceived >= value) unlocked = true;

    if (unlocked) {
      addEarnedBadge(user, badge, new Date());
      // Award XP for unlocking badge (but don't recurse)
      if (badge.xpReward > 0) {
        user.totalXP += badge.xpReward;
        user.xp += badge.xpReward;
        user.xpHistory.push({ amount: badge.xpReward, source: "badge", description: `Earned badge: ${badge.name}`, earnedAt: new Date() });
      }
      newlyEarned.badges.push(badge);

      // Send notification email (non-blocking)
      sendBadgeEmail(user.collegeEmail, user.name, badge).catch(console.error);
    }
  }

  const allAchievements = await Achievement.find({ isActive: true });
  for (const achievement of allAchievements) {
    const alreadyHas = user.achievements.some((a) => a.achievement.toString() === achievement._id.toString());
    if (alreadyHas) continue;

    const { type, value } = achievement.unlockCondition;
    let unlocked = false;
    if (type === "totalXP" && newTotalXP >= value)         unlocked = true;
    if (type === "level"   && levelInfo.currentLevel >= value) unlocked = true;
    if (type === "streak"  && user.dailyStreak >= value)    unlocked = true;
    if (type === "posts"   && user.postsCount >= value)     unlocked = true;
    if (type === "badges"  && user.earnedBadges.length >= value)  unlocked = true;

    if (unlocked) {
      user.achievements.push({ achievement: achievement._id, earnedAt: new Date() });
      if (achievement.xpReward > 0) {
        user.totalXP += achievement.xpReward;
        user.xp += achievement.xpReward;
        user.xpHistory.push({ amount: achievement.xpReward, source: "achievement", description: `Earned: ${achievement.name}`, earnedAt: new Date() });
      }
      newlyEarned.achievements.push(achievement);
    }
  }

  const finalLevelInfo = getLevelFromXP(user.totalXP);
  if (finalLevelInfo.currentLevel !== user.currentLevel) {
    const previousRecordedLevel = user.currentLevel;
    user.currentLevel = finalLevelInfo.currentLevel;
    user.level = finalLevelInfo.currentLevel;
    recordLevelProgress(user, previousRecordedLevel, finalLevelInfo.currentLevel, new Date());
  }
  user.levelTitle = finalLevelInfo.levelTitle;
  user.currentXP = finalLevelInfo.currentXP;
  user.requiredXP = finalLevelInfo.requiredXP;
  user.progressPercent = finalLevelInfo.progressPercent;

  await user.save();

  return {
    xpAwarded: amount,
    totalXP: user.totalXP,
    leveledUp,
    previousLevel,
    ...getLevelFromXP(user.totalXP),
    newlyEarned,
  };
};

/**
 * Update user's daily streak. Call on each meaningful user activity.
 */
const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let streakChanged = false;

  if (!user.lastActiveDate) {
    // First time activity
    user.dailyStreak   = 1;
    user.longestStreak = 1;
    user.lastActiveDate = today;
    streakChanged = true;
  } else {
    const lastActive = new Date(user.lastActiveDate);
    const lastDay    = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    const diffDays   = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Already active today — no change
    } else if (diffDays === 1) {
      // Consecutive day — increment streak
      user.dailyStreak += 1;
      if (user.dailyStreak > user.longestStreak) user.longestStreak = user.dailyStreak;
      user.lastActiveDate = today;
      streakChanged = true;
    } else {
      // Missed days — reset streak
      user.dailyStreak    = 1;
      user.lastActiveDate = today;
      streakChanged = true;
    }
  }

  // Check streak badges
  const newStreakBadges = [];
  if (streakChanged) {
    for (const { days, badgeName } of STREAK_BADGES) {
      if (user.dailyStreak >= days) {
        const badge = await Badge.findOne({ name: badgeName });
        if (badge) {
          const alreadyHas = user.earnedBadges.some((b) => b.badge.toString() === badge._id.toString());
          if (!alreadyHas) {
            addEarnedBadge(user, badge, new Date());
            newStreakBadges.push(badge);
            if (badge.xpReward > 0) {
              user.totalXP += badge.xpReward;
              user.xp += badge.xpReward;
              user.xpHistory.push({
                amount: badge.xpReward, source: "streak",
                description: `Streak badge: ${badge.name}`,
                earnedAt: new Date(),
              });
            }
          }
        }
      }
    }

    const finalLevelInfo = getLevelFromXP(user.totalXP);
    if (finalLevelInfo.currentLevel !== user.currentLevel) {
      const previousRecordedLevel = user.currentLevel;
      user.currentLevel = finalLevelInfo.currentLevel;
      user.level = finalLevelInfo.currentLevel;
      recordLevelProgress(user, previousRecordedLevel, finalLevelInfo.currentLevel, new Date());
    }
    user.levelTitle = finalLevelInfo.levelTitle;
    user.currentXP = finalLevelInfo.currentXP;
    user.requiredXP = finalLevelInfo.requiredXP;
    user.progressPercent = finalLevelInfo.progressPercent;

    await user.save();
  }

  return {
    dailyStreak:   user.dailyStreak,
    longestStreak: user.longestStreak,
    streakChanged,
    newStreakBadges,
  };
};

module.exports = { awardXP, updateStreak };
