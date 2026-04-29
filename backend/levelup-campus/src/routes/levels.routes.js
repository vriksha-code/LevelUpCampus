const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { getLevels } = require("../controllers/levels.controller");

router.get("/", protect, getLevels);

module.exports = router;
