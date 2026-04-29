/**
 * Level configuration for LevelUp Campus.
 * Each level defines the XP required to reach it and a title.
 */
const LEVELS = [
  { level: 1,  title: "Freshman",       requiredXP: 0,     totalXPNeeded: 100  },
  { level: 2,  title: "Explorer",       requiredXP: 100,   totalXPNeeded: 250  },
  { level: 3,  title: "Scholar",        requiredXP: 350,   totalXPNeeded: 400  },
  { level: 4,  title: "Achiever",       requiredXP: 750,   totalXPNeeded: 600  },
  { level: 5,  title: "Specialist",     requiredXP: 1350,  totalXPNeeded: 900  },
  { level: 6,  title: "Expert",         requiredXP: 2250,  totalXPNeeded: 1200 },
  { level: 7,  title: "Master",         requiredXP: 3450,  totalXPNeeded: 1600 },
  { level: 8,  title: "Grandmaster",    requiredXP: 5050,  totalXPNeeded: 2000 },
  { level: 9,  title: "Legend",         requiredXP: 7050,  totalXPNeeded: 2500 },
  { level: 10, title: "Campus Legend",  requiredXP: 9550,  totalXPNeeded: 3000 },
];

const MAX_LEVEL = LEVELS.length;

/**
 * Given total cumulative XP, returns level info
 */
const getLevelFromXP = (totalXP) => {
  let currentLevelData = LEVELS[0];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].requiredXP) {
      currentLevelData = LEVELS[i];
      break;
    }
  }

  const currentLevelIndex = LEVELS.indexOf(currentLevelData);
  const nextLevelData = LEVELS[currentLevelIndex + 1] || null;

  const xpIntoCurrentLevel = totalXP - currentLevelData.requiredXP;
  const xpNeededForCurrentLevel = currentLevelData.totalXPNeeded;
  const progressPercent = nextLevelData
    ? Math.min(100, Math.floor((xpIntoCurrentLevel / xpNeededForCurrentLevel) * 100))
    : 100;

  // Next 2-3 levels preview
  const upcomingLevels = LEVELS.slice(currentLevelIndex + 1, currentLevelIndex + 4).map((l) => ({
    level: l.level,
    title: l.title,
    requiredXP: l.requiredXP,
    xpNeeded: Math.max(0, l.requiredXP - totalXP),
  }));

  return {
    currentLevel: currentLevelData.level,
    levelTitle: currentLevelData.title,
    totalXP,
    currentXP: xpIntoCurrentLevel,
    requiredXP: xpNeededForCurrentLevel,
    progressPercent,
    nextLevel: nextLevelData
      ? {
          level: nextLevelData.level,
          title: nextLevelData.title,
          xpNeeded: nextLevelData.requiredXP - totalXP,
        }
      : null,
    upcomingLevels,
    isMaxLevel: !nextLevelData,
  };
};

const STREAK_BADGES = [
  { days: 7,   badgeName: "Week Warrior"    },
  { days: 15,  badgeName: "Fortnight Fire"  },
  { days: 30,  badgeName: "Monthly Maven"   },
  { days: 100, badgeName: "Century Scholar" },
];

module.exports = { LEVELS, MAX_LEVEL, getLevelFromXP, STREAK_BADGES };
