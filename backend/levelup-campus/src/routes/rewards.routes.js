const express = require("express");
const router  = express.Router();
const { getRewardsSummary, getBadges, getAchievements } = require("../controllers/rewards.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/",            protect, getRewardsSummary);
router.get("/badges",      protect, getBadges);
router.get("/achievements", protect, getAchievements);

module.exports = router;
