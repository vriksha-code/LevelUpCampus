const express = require("express");
const router  = express.Router();
const { addXP, getXPHistory } = require("../controllers/xp.controller");
const { protect }             = require("../middleware/auth.middleware");
const { validateAddXP }       = require("../middleware/validate.middleware");

router.post("/",        protect, validateAddXP, addXP);
router.post("/add",     protect, validateAddXP, addXP);
router.get("/history",  protect, getXPHistory);

module.exports = router;
