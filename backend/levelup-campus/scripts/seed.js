require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const User        = require("../src/models/User");
const Badge       = require("../src/models/Badge");
const Achievement = require("../src/models/Achievement");
const { getLevelFromXP, LEVELS } = require("../src/config/levels");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/levelup_campus";

// ─── Badge Seed Data ──────────────────────────────────────────────────────────
const badges = [
  // Streak badges
  { name: "Week Warrior",    description: "Maintained a 7-day streak",   icon: "🔥", category: "streak",    unlockCondition: { type: "streak",  value: 7   }, xpReward: 50,  rarity: "common"    },
  { name: "Fortnight Fire",  description: "Maintained a 15-day streak",  icon: "⚡", category: "streak",    unlockCondition: { type: "streak",  value: 15  }, xpReward: 100, rarity: "rare"      },
  { name: "Monthly Maven",   description: "Maintained a 30-day streak",  icon: "🌟", category: "streak",    unlockCondition: { type: "streak",  value: 30  }, xpReward: 250, rarity: "epic"      },
  { name: "Century Scholar", description: "Maintained a 100-day streak", icon: "💎", category: "streak",    unlockCondition: { type: "streak",  value: 100 }, xpReward: 1000, rarity: "legendary" },

  // XP badges
  { name: "XP Initiate",    description: "Earned your first 100 XP",    icon: "⭐", category: "xp",       unlockCondition: { type: "totalXP", value: 100  }, xpReward: 10,  rarity: "common"    },
  { name: "XP Hunter",      description: "Earned 500 XP total",          icon: "🎯", category: "xp",       unlockCondition: { type: "totalXP", value: 500  }, xpReward: 25,  rarity: "common"    },
  { name: "XP Master",      description: "Earned 2000 XP total",         icon: "🏆", category: "xp",       unlockCondition: { type: "totalXP", value: 2000 }, xpReward: 100, rarity: "rare"      },
  { name: "XP Legend",      description: "Earned 5000 XP total",         icon: "👑", category: "xp",       unlockCondition: { type: "totalXP", value: 5000 }, xpReward: 500, rarity: "legendary" },

  // Level badges
  { name: "Level 3 Reached", description: "Reached level 3",           icon: "✨", category: "level",    unlockCondition: { type: "level",   value: 3   }, xpReward: 25,  rarity: "common"    },
  { name: "Level 5 Reached", description: "Reached level 5",            icon: "🚀", category: "level",    unlockCondition: { type: "level",   value: 5   }, xpReward: 75,  rarity: "common"    },
  { name: "Level 8 Reached", description: "Reached level 8",            icon: "🌈", category: "level",    unlockCondition: { type: "level",   value: 8   }, xpReward: 200, rarity: "epic"      },
  { name: "Campus Legend",   description: "Reached the maximum level",   icon: "🦁", category: "level",    unlockCondition: { type: "level",   value: 10  }, xpReward: 1000, rarity: "legendary" },

  // Community badges
  { name: "First Post",      description: "Created your first post",      icon: "📝", category: "community", unlockCondition: { type: "posts",   value: 1   }, xpReward: 20,  rarity: "common"    },
  { name: "Prolific Poster", description: "Created 10 discussion posts",  icon: "📚", category: "community", unlockCondition: { type: "posts",   value: 10  }, xpReward: 100, rarity: "rare"      },
  { name: "Community Hero",  description: "Received 50 upvotes on posts", icon: "❤️", category: "community", unlockCondition: { type: "upvotesReceived", value: 50 }, xpReward: 150, rarity: "epic" },
];

// ─── Achievement Seed Data ────────────────────────────────────────────────────
const achievements = [
  { name: "First Steps",       description: "Complete your first XP task",        icon: "👶", category: "milestone", unlockCondition: { type: "totalXP", value: 1    }, xpReward: 10  },
  { name: "On a Roll",         description: "Earn 1000 XP in total",              icon: "🎳", category: "milestone", unlockCondition: { type: "totalXP", value: 1000 }, xpReward: 50  },
  { name: "Knowledge Seeker",  description: "Earn 3000 XP in total",              icon: "📖", category: "learning",  unlockCondition: { type: "totalXP", value: 3000 }, xpReward: 150 },
  { name: "Scholar Supreme",   description: "Earn 7000 XP in total",              icon: "🎓", category: "learning",  unlockCondition: { type: "totalXP", value: 7000 }, xpReward: 300 },
  { name: "Halfway There",     description: "Reach level 5",                       icon: "🌗", category: "milestone", unlockCondition: { type: "level",   value: 5    }, xpReward: 50  },
  { name: "Top of the Class",  description: "Reach the maximum level (10)",        icon: "🏅", category: "milestone", unlockCondition: { type: "level",   value: 10   }, xpReward: 500 },
  { name: "Consistent",        description: "Maintain a 7-day streak",             icon: "📅", category: "streak",    unlockCondition: { type: "streak",  value: 7    }, xpReward: 30  },
  { name: "Unstoppable",       description: "Maintain a 30-day streak",            icon: "💪", category: "streak",    unlockCondition: { type: "streak",  value: 30   }, xpReward: 200 },
  { name: "Community Starter", description: "Create your first discussion post",   icon: "💬", category: "community", unlockCondition: { type: "posts",   value: 1    }, xpReward: 15  },
  { name: "Badge Collector",   description: "Earn 5 different badges",             icon: "🎖️", category: "milestone", unlockCondition: { type: "badges",  value: 5    }, xpReward: 50  },
  { name: "Badge Hunter",      description: "Earn 10 different badges",            icon: "🗂️", category: "milestone", unlockCondition: { type: "badges",  value: 10   }, xpReward: 150 },
];

// ─── Sample User Seed Data ────────────────────────────────────────────────────
const sampleUsers = [
  { name: "Arjun Sharma",   email: "arjun.sharma@heritageit.edu.in",   totalXP: 4800, streak: 23 },
  { name: "Priya Patel",    email: "priya.patel@heritageit.edu.in",    totalXP: 3500, streak: 15 },
  { name: "Rohan Mehta",    email: "rohan.mehta@heritageit.edu.in",    totalXP: 2100, streak: 8  },
  { name: "Sneha Gupta",    email: "sneha.gupta@heritageit.edu.in",    totalXP: 5200, streak: 30 },
  { name: "Vikram Singh",   email: "vikram.singh@heritageit.edu.in",   totalXP: 1200, streak: 3  },
  { name: "Ananya Iyer",    email: "ananya.iyer@heritageit.edu.in",    totalXP: 7100, streak: 45 },
  { name: "Dev Kapoor",     email: "dev.kapoor@heritageit.edu.in",     totalXP: 900,  streak: 1  },
  { name: "Meera Nair",     email: "meera.nair@heritageit.edu.in",     totalXP: 3200, streak: 12 },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Badge.deleteMany({}),
      Achievement.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing data");

    // Insert badges
    const insertedBadges = await Badge.insertMany(badges);
    console.log(`✅ Inserted ${insertedBadges.length} badges`);

    // Insert achievements
    const insertedAchievements = await Achievement.insertMany(achievements);
    console.log(`✅ Inserted ${insertedAchievements.length} achievements`);

    // Create badge lookup
    const badgeMap = {};
    insertedBadges.forEach((b) => { badgeMap[b.name] = b._id; });

    // Insert sample users
    for (const u of sampleUsers) {
      const levelInfo = getLevelFromXP(u.totalXP);
      const now = new Date();
      const lastActive = new Date(now - (u.streak > 0 ? 0 : 1) * 24 * 60 * 60 * 1000);

      // Determine which badges user has earned
      const earnedBadges = insertedBadges
        .filter((b) => {
          const { type, value } = b.unlockCondition;
          if (type === "totalXP") return u.totalXP >= value;
          if (type === "level")   return levelInfo.currentLevel >= value;
          if (type === "streak")  return u.streak >= value;
          return false;
        })
        .map((b) => ({ badge: b._id, earnedAt: new Date() }));

      const levelHistory = Array.from({ length: levelInfo.currentLevel }, (_, index) => {
        const levelNumber = index + 1;
        const levelData = LEVELS.find((entry) => entry.level === levelNumber);
        return {
          level: levelNumber,
          title: levelData ? levelData.title : `Level ${levelNumber}`,
          date: new Date(now.getTime() - (levelInfo.currentLevel - levelNumber) * 2 * 24 * 60 * 60 * 1000),
        };
      });

      // Determine which achievements user has earned
      const userAchievements = insertedAchievements
        .filter((a) => {
          const { type, value } = a.unlockCondition;
          if (type === "totalXP") return u.totalXP >= value;
          if (type === "level")   return levelInfo.currentLevel >= value;
          if (type === "streak")  return u.streak >= value;
          if (type === "badges")  return earnedBadges.length >= value;
          return false;
        })
        .map((a) => ({ achievement: a._id, earnedAt: new Date() }));

      // Build XP history
      const xpHistory = [
        { amount: Math.floor(u.totalXP * 0.4), source: "task",      description: "Completed assignments",  earnedAt: new Date(now - 10 * 24 * 60 * 60 * 1000) },
        { amount: Math.floor(u.totalXP * 0.3), source: "quiz",      description: "Quiz completions",        earnedAt: new Date(now - 5  * 24 * 60 * 60 * 1000) },
        { amount: Math.floor(u.totalXP * 0.2), source: "community", description: "Community participation", earnedAt: new Date(now - 2  * 24 * 60 * 60 * 1000) },
        { amount: Math.floor(u.totalXP * 0.1), source: "streak",    description: "Streak bonuses",          earnedAt: new Date(now - 1  * 24 * 60 * 60 * 1000) },
      ];

      await User.create({
        name:         u.name,
        collegeEmail: u.email,
        isVerified:   true,
        xp:           u.totalXP,
        level:        levelInfo.currentLevel,
        totalXP:      u.totalXP,
        currentLevel: levelInfo.currentLevel,
        levelTitle:   levelInfo.levelTitle,
        currentXP:    levelInfo.currentXP,
        requiredXP:   levelInfo.requiredXP,
        progressPercent: levelInfo.progressPercent,
        dailyStreak:  u.streak,
        longestStreak: u.streak,
        lastActiveDate: lastActive,
        earnedBadges: earnedBadges,
        levelHistory,
        achievements: userAchievements,
        xpHistory,
        postsCount:   Math.floor(Math.random() * 8),
        commentsCount: Math.floor(Math.random() * 20),
        upvotesReceived: Math.floor(Math.random() * 30),
      });
      console.log(`  👤 Created user: ${u.name} (Level ${levelInfo.currentLevel}, ${u.totalXP} XP, ${u.streak}-day streak)`);
    }

    console.log(`\n✅ Seeded ${sampleUsers.length} users`);
    console.log("\n🎮 LevelUp Campus database seeded successfully!\n");

    // Summary
    console.log("═══ Seed Summary ════════════════════");
    console.log(`  Badges:       ${insertedBadges.length}`);
    console.log(`  Achievements: ${insertedAchievements.length}`);
    console.log(`  Users:        ${sampleUsers.length}`);
    console.log("═════════════════════════════════════\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
