const User = require("../models/User");
const { ChatMessage } = require("../models/Community");

const USER_PUBLIC_FIELDS = "name avatar currentLevel levelTitle totalXP dailyStreak longestStreak postsCount answersCount xpHistory";

const calculateGamifiedScore = ({ totalXP = 0, dailyStreak = 0, answersCount = 0, weeklyXP = 0, weeklyAnswers = 0, period = "all-time" }) => {
  if (period === "weekly") {
    return weeklyXP + (dailyStreak * 20) + (weeklyAnswers * 50);
  }

  return totalXP + (dailyStreak * 25) + (answersCount * 75);
};

const buildLeaderboardPayload = (user, rank, score, extra = {}) => ({
  rank,
  id: user._id,
  name: user.name,
  avatar: user.avatar,
  currentLevel: user.currentLevel,
  levelTitle: user.levelTitle,
  totalXP: user.totalXP,
  dailyStreak: user.dailyStreak,
  longestStreak: user.longestStreak,
  answersCount: user.answersCount || 0,
  score,
  ...extra,
});

/**
 * GET /api/leaderboard?period=weekly|all-time
 */
const getGamifiedLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const period = req.query.period === "weekly" ? "weekly" : "all-time";

    const users = await User.find({ isVerified: true }).select(USER_PUBLIC_FIELDS).limit(200);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const enriched = await Promise.all(users.map(async (user) => {
      if (period === "weekly") {
        const weeklyXP = (user.xpHistory || []).reduce((sum, entry) => {
          const earnedAt = new Date(entry.earnedAt);
          return earnedAt >= weekAgo ? sum + Number(entry.amount || 0) : sum;
        }, 0);

        const weeklyAnswers = await ChatMessage.countDocuments({
          sender: user._id,
          messageType: "answer",
          createdAt: { $gte: weekAgo },
        });

        const score = calculateGamifiedScore({
          dailyStreak: user.dailyStreak,
          weeklyXP,
          weeklyAnswers,
          period,
        });

        return { user, score, weeklyXP, weeklyAnswers };
      }

      const score = calculateGamifiedScore({
        totalXP: user.totalXP,
        dailyStreak: user.dailyStreak,
        answersCount: user.answersCount,
        period,
      });

      return { user, score };
    }));

    const ranked = enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => buildLeaderboardPayload(entry.user, index + 1, entry.score, period === "weekly" ? { weeklyXP: entry.weeklyXP, weeklyAnswers: entry.weeklyAnswers } : {}));

    let myRank = null;
    if (req.user) {
      const myIndex = ranked.findIndex((entry) => String(entry.id) === String(req.user._id));
      myRank = myIndex !== -1 ? myIndex + 1 : null;
    }

    res.json({ success: true, data: { leaderboard: ranked, myRank, period } });
  } catch (error) {
    next(error);
  }
};

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

module.exports = { getWeeklyLeaderboard, getFastestProgress, getStreakHolders, getGamifiedLeaderboard };
