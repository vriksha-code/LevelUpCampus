const { LEVELS } = require("../config/levels");

const getLevelTitle = (levelNumber) => {
  const level = LEVELS.find((entry) => entry.level === levelNumber);
  return level ? level.title : `Level ${levelNumber}`;
};

const getBadgeEntries = (user) => (Array.isArray(user.earnedBadges) ? user.earnedBadges : []);

const ensureLevelHistory = (user) => {
  if (!Array.isArray(user.levelHistory)) {
    user.levelHistory = [];
  }

  const existingLevels = new Set(user.levelHistory.map((entry) => Number(entry.level)));
  const currentLevel = Math.max(1, Number(user.currentLevel || user.level || 1));
  const baseDate = user.createdAt ? new Date(user.createdAt) : new Date();

  if (user.levelHistory.length === 0) {
    for (let level = 1; level <= currentLevel; level += 1) {
      user.levelHistory.push({
        level,
        title: getLevelTitle(level),
        date: new Date(baseDate.getTime() + (level - 1) * 24 * 60 * 60 * 1000),
      });
    }
    return true;
  }

  let changed = false;
  for (let level = 1; level <= currentLevel; level += 1) {
    if (!existingLevels.has(level)) {
      user.levelHistory.push({
        level,
        title: getLevelTitle(level),
        date: new Date(baseDate.getTime() + (level - 1) * 24 * 60 * 60 * 1000),
      });
      changed = true;
    }
  }

  user.levelHistory.sort((a, b) => Number(a.level) - Number(b.level));
  return changed;
};

const recordLevelProgress = (user, previousLevel, nextLevel, date = new Date()) => {
  if (!Array.isArray(user.levelHistory)) {
    user.levelHistory = [];
  }

  const existingLevels = new Set(user.levelHistory.map((entry) => Number(entry.level)));
  let changed = false;

  for (let level = Number(previousLevel) + 1; level <= Number(nextLevel); level += 1) {
    if (existingLevels.has(level)) {
      continue;
    }

    user.levelHistory.push({
      level,
      title: getLevelTitle(level),
      date,
    });
    changed = true;
  }

  if (changed) {
    user.levelHistory.sort((a, b) => Number(a.level) - Number(b.level));
  }

  return changed;
};

const ensureProgressShape = (user) => {
  let changed = false;

  const normalizedXP = Number(user.totalXP ?? user.xp ?? 0);
  const normalizedLevel = Number(user.currentLevel ?? user.level ?? 1);

  if (user.totalXP !== normalizedXP) {
    user.totalXP = normalizedXP;
    changed = true;
  }
  if (user.xp !== normalizedXP) {
    user.xp = normalizedXP;
    changed = true;
  }

  if (user.currentLevel !== normalizedLevel) {
    user.currentLevel = normalizedLevel;
    changed = true;
  }
  if (user.level !== normalizedLevel) {
    user.level = normalizedLevel;
    changed = true;
  }

  if (!Array.isArray(user.earnedBadges)) {
    user.earnedBadges = [];
  }
  if (!Array.isArray(user.badges)) {
    user.badges = [];
  }

  if (user.earnedBadges.length === 0 && user.badges.length > 0) {
    user.earnedBadges = [...user.badges];
    changed = true;
  }
  if (user.badges.length === 0 && user.earnedBadges.length > 0) {
    user.badges = [...user.earnedBadges];
    changed = true;
  }

  if ((!Array.isArray(user.earnedBadges) || user.earnedBadges.length === 0) && Array.isArray(user.badges) && user.badges.length) {
    user.earnedBadges = [...user.badges];
    changed = true;
  }

  if ((!Array.isArray(user.badges) || user.badges.length.length === 0) && Array.isArray(user.earnedBadges) && user.earnedBadges.length) {
    user.badges = [...user.earnedBadges];
    changed = true;
  }

  if (ensureLevelHistory(user)) {
    changed = true;
  }

  return changed;
};

const addEarnedBadge = (user, badge, earnedAt = new Date()) => {
  if (!Array.isArray(user.earnedBadges)) {
    user.earnedBadges = [];
  }

  const alreadyHas = user.earnedBadges.some((entry) => entry.badge?.toString() === badge._id.toString());
  if (alreadyHas) {
    return false;
  }

  user.earnedBadges.push({ badge: badge._id, earnedAt });
  return true;
};

module.exports = {
  addEarnedBadge,
  ensureLevelHistory,
  ensureProgressShape,
  getBadgeEntries,
  getLevelTitle,
  recordLevelProgress,
};
