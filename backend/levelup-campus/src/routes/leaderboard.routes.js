const express = require("express");
const router  = express.Router();
const { getWeeklyLeaderboard, getFastestProgress, getStreakHolders, getGamifiedLeaderboard } = require("../controllers/leaderboard.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/",              protect, getGamifiedLeaderboard);
router.get("/weekly",           protect, getWeeklyLeaderboard);
router.get("/fastest-progress", protect, getFastestProgress);
router.get("/streak-holders",   protect, getStreakHolders);

module.exports = router;
