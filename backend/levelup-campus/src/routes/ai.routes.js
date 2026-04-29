const express = require("express");
const router = express.Router();
const { answerQuestion } = require("../controllers/ai.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/answer", protect, answerQuestion);

module.exports = router;
