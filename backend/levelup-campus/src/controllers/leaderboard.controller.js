const User = require("../models/User");

const USER_PUBLIC_FIELDS = "name avatar currentLevel levelTitle totalXP dailyStreak longestStreak postsCount";

/**
 * GET /api/leaderboard/weekly
 * Top users by XP earned in the last 7 days
 */
const getWeeklyLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Aggregate XP earned in last 7 days using xpHistory
    const users = await User.aggregate([
      { $match: { isVerified: true } },
      {
        $addFields: {
          weeklyXP: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$xpHistory",
                    as:    "entry",
                    cond:  { $gte: ["$$entry.earnedAt", sevenDaysAgo] },
                  },
                },
                as: "entry",
                in: "$$entry.amount",
              },
            },
          },
        },
      },
      { $sort: { weeklyXP: -1, totalXP: -1 } },
      { $limit: limit },
      {
        $project: {
          name: 1, avatar: 1, currentLevel: 1, levelTitle: 1,
          totalXP: 1, dailyStreak: 1, weeklyXP: 1,
        },
      },
    ]);

    const ranked = users.map((u, i) => ({ rank: i + 1, ...u }));

    // Find requesting user's rank
    let myRank = null;
    if (req.user) {
      const myPos = ranked.findIndex((u) => u._id.toString() === req.user._id.toString());
      myRank = myPos !== -1 ? myPos + 1 : null;
    }

    res.json({ success: true, data: { leaderboard: ranked, myRank, period: "weekly" } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard/fastest-progress
 * Users who gained the most XP (total) — overall top performers
 */
const getFastestProgress = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const users = await User.find({ isVerified: true })
      .sort({ totalXP: -1 })
      .limit(limit)
      .select(USER_PUBLIC_FIELDS);

    const ranked = users.map((u, i) => ({
      rank:         i + 1,
      id:           u._id,
      name:         u.name,
      avatar:       u.avatar,
      currentLevel: u.currentLevel,
      levelTitle:   u.levelTitle,
      totalXP:      u.totalXP,
      dailyStreak:  u.dailyStreak,
    }));

    res.json({ success: true, data: { leaderboard: ranked, type: "fastest-progress" } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard/streak-holders
 * Users ranked by current daily streak
 */
const getStreakHolders = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const users = await User.find({ isVerified: true, dailyStreak: { $gt: 0 } })
      .sort({ dailyStreak: -1, longestStreak: -1, totalXP: -1 })
      .limit(limit)
      .select(USER_PUBLIC_FIELDS);

    const ranked = users.map((u, i) => ({
      rank:          i + 1,
      id:            u._id,
      name:          u.name,
      avatar:        u.avatar,
      currentLevel:  u.currentLevel,
      levelTitle:    u.levelTitle,
      totalXP:       u.totalXP,
      dailyStreak:   u.dailyStreak,
      longestStreak: u.longestStreak,
    }));

    res.json({ success: true, data: { leaderboard: ranked, type: "streak-holders" } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWeeklyLeaderboard, getFastestProgress, getStreakHolders };
