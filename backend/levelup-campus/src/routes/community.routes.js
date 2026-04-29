const express = require("express");
const router  = express.Router();
const {
  createPost, getPosts, getPost,
  addComment, upvotePost, getChatHistory,
} = require("../controllers/community.controller");
const { protect }                           = require("../middleware/auth.middleware");
const { validateCreatePost, validateComment } = require("../middleware/validate.middleware");

router.post("/posts",                 protect, validateCreatePost, createPost);
router.get("/posts",                  protect, getPosts);
router.get("/posts/:id",              protect, getPost);
router.post("/posts/:id/comment",     protect, validateComment, addComment);
router.post("/posts/:id/upvote",      protect, upvotePost);
router.get("/chat/history",           protect, getChatHistory);

module.exports = router;
