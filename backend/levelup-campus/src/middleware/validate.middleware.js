const { body, validationResult } = require("express-validator");

// ─── Validation result handler ────────────────────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth validators ──────────────────────────────────────────────────────────
const validateSendOTP = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  handleValidation,
];

const validateVerifyOTP = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  handleValidation,
];

// ─── XP validators ────────────────────────────────────────────────────────────
const validateAddXP = [
  body("amount")
    .isInt({ min: 1, max: 10000 })
    .withMessage("XP amount must be between 1 and 10000"),
  body("source")
    .isIn(["task", "quiz", "assignment", "streak", "community", "manual"])
    .withMessage("Invalid XP source"),
  body("description").optional().trim().isLength({ max: 200 }),
  handleValidation,
];

// ─── Community validators ─────────────────────────────────────────────────────
const validateCreatePost = [
  body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Title must be 5–200 characters"),
  body("content").trim().isLength({ min: 10, max: 5000 }).withMessage("Content must be 10–5000 characters"),
  body("category")
    .optional()
    .isIn(["general", "peer-help", "resources", "announcements", "off-topic"])
    .withMessage("Invalid category"),
  body("tags").optional().isArray({ max: 5 }).withMessage("Maximum 5 tags allowed"),
  handleValidation,
];

const validateComment = [
  body("content").trim().isLength({ min: 1, max: 500 }).withMessage("Comment must be 1–500 characters"),
  handleValidation,
];

module.exports = {
  validateSendOTP,
  validateVerifyOTP,
  validateAddXP,
  validateCreatePost,
  validateComment,
};
