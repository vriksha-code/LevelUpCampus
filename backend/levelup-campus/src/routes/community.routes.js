const express = require("express");
const router  = express.Router();
const {
  createPost, getPosts, getPost,
  addComment, upvotePost, getChatHistory, createQuestion, solveQuestion, acceptAnswerByMessage,
} = require("../controllers/community.controller");
const { protect }                           = require("../middleware/auth.middleware");
const { validateCreatePost, validateComment } = require("../middleware/validate.middleware");

router.post("/posts",                 protect, validateCreatePost, createPost);
router.get("/posts",                  protect, getPosts);
router.get("/posts/:id",              protect, getPost);
router.post("/posts/:id/comment",     protect, validateComment, addComment);
router.post("/posts/:id/upvote",      protect, upvotePost);
router.get("/chat/history",           protect, getChatHistory);
router.post("/question",              protect, createQuestion);
router.patch("/question/:id/solve",   protect, solveQuestion);
router.patch("/accept/:messageId",    protect, acceptAnswerByMessage);

module.exports = router;
