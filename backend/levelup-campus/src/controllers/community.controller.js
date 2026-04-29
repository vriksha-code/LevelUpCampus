const { DiscussionPost, ChatMessage } = require("../models/Community");
const User = require("../models/User");
const { awardXP } = require("../services/xp.service");

/**
 * POST /api/community/posts
 */
const createPost = async (req, res, next) => {
  try {
    const { title, content, category, tags } = req.body;

    const post = await DiscussionPost.create({
      author:   req.user._id,
      title,
      content,
      category: category || "general",
      tags:     tags || [],
    });

    // Increment user's post count & award XP
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await awardXP(req.user._id, 20, "community", `Created post: "${title.substring(0, 50)}"`);

    await post.populate("author", "name avatar currentLevel levelTitle");

    res.status(201).json({
      success: true,
      message: "Post created! +20 XP earned 🎯",
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/community/posts
 */
const getPosts = async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page) || 1;
    const limit    = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip     = (page - 1) * limit;
    const category = req.query.category;
    const sort     = req.query.sort || "latest"; // "latest" | "top"

    const filter = { isActive: true };
    if (category) filter.category = category;

    const sortQuery = sort === "top"
      ? { upvotes: -1, createdAt: -1 }
      : { isPinned: -1, createdAt: -1 };

    const [posts, total] = await Promise.all([
      DiscussionPost.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate("author", "name avatar currentLevel levelTitle")
        .select("-comments"),
      DiscussionPost.countDocuments(filter),
    ]);

    // Increment view count
    const postIds = posts.map((p) => p._id);
    await DiscussionPost.updateMany({ _id: { $in: postIds } }, { $inc: { views: 1 } });

    const enriched = posts.map((p) => ({
      ...p.toObject(),
      upvoteCount:  p.upvotes.length,
      isUpvoted:    req.user ? p.upvotes.includes(req.user._id) : false,
    }));

    res.json({
      success: true,
      data: {
        posts: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/community/posts/:id
 */
const getPost = async (req, res, next) => {
  try {
    const post = await DiscussionPost.findById(req.params.id)
      .populate("author", "name avatar currentLevel levelTitle")
      .populate("comments.author", "name avatar currentLevel");

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    await DiscussionPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: {
        ...post.toObject(),
        upvoteCount: post.upvotes.length,
        isUpvoted:   req.user ? post.upvotes.includes(req.user._id) : false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/community/posts/:id/comment
 */
const addComment = async (req, res, next) => {
  try {
    const post = await DiscussionPost.findById(req.params.id);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const comment = {
      author:  req.user._id,
      content: req.body.content,
    };

    post.comments.push(comment);
    await post.save();

    // Update community stats & award XP
    await User.findByIdAndUpdate(req.user._id, { $inc: { commentsCount: 1 } });
    await awardXP(req.user._id, 10, "community", "Added a comment");

    await post.populate("comments.author", "name avatar currentLevel");
    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment added! +10 XP 💬",
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/community/posts/:id/upvote
 * Toggle upvote on a post
 */
const upvotePost = async (req, res, next) => {
  try {
    const post = await DiscussionPost.findById(req.params.id);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const userId  = req.user._id;
    const hasVoted = post.upvotes.some((id) => id.toString() === userId.toString());

    if (hasVoted) {
      post.upvotes.pull(userId);
      await post.save();
      // Remove upvote from author's count
      await User.findByIdAndUpdate(post.author, { $inc: { upvotesReceived: -1 } });
      return res.json({ success: true, message: "Upvote removed", upvoteCount: post.upvotes.length, isUpvoted: false });
    } else {
      post.upvotes.push(userId);
      await post.save();
      await User.findByIdAndUpdate(post.author, { $inc: { upvotesReceived: 1 } });
      return res.json({ success: true, message: "Post upvoted! 👍", upvoteCount: post.upvotes.length, isUpvoted: true });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/community/chat/history
 * Get recent chat messages for a room
 */
const getChatHistory = async (req, res, next) => {
  try {
    const room  = req.query.room || "general";
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const messages = await ChatMessage.find({ room })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "name avatar currentLevel");

    res.json({
      success: true,
      data: { messages: messages.reverse(), room },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/community/question
 * Create a chat question message
 */
const createQuestion = async (req, res, next) => {
  try {
    const { content, room } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Question content is required" });
    }

    const targetRoom = room || "general";

    const message = await ChatMessage.create({
      sender: req.user._id,
      room: targetRoom,
      content: content.trim(),
      messageType: "question",
      questionOwner: req.user._id,
    });

    const populated = await message.populate("sender", "name avatar currentLevel levelTitle");

    res.status(201).json({ success: true, data: populated, message: "Question posted" });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/community/question/:id/solve
 * Mark a question message as solved (only owner can mark)
 */
const solveQuestion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const msg = await ChatMessage.findById(id);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });
    if (String(msg.questionOwner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only question owner can mark as solved" });
    }

    msg.isSolved = true;
    await msg.save();

    res.json({ success: true, message: "Question marked as solved", data: msg });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPost, getPosts, getPost, addComment, upvotePost, getChatHistory, createQuestion, solveQuestion };
