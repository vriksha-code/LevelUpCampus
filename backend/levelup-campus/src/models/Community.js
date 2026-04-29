const mongoose = require("mongoose");

// ─── Chat Message (Socket.IO / real-time) ─────────────────────────────────────
const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: String,
      default: "general",
      enum: ["general", "peer-help", "announcements", "random"],
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
      senderName: { type: String, default: "" },
      content: { type: String, default: "" },
    },
    type: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

// ─── Comment ─────────────────────────────────────────────────────────────────
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ─── Discussion Post ──────────────────────────────────────────────────────────
const discussionPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Post title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
    category: {
      type: String,
      enum: ["general", "peer-help", "resources", "announcements", "off-topic"],
      default: "general",
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

discussionPostSchema.index({ category: 1, createdAt: -1 });
discussionPostSchema.index({ upvotes: -1 });

// Virtual for upvote count
discussionPostSchema.virtual("upvoteCount").get(function () {
  return this.upvotes.length;
});

const ChatMessage    = mongoose.model("ChatMessage",    chatMessageSchema);
const DiscussionPost = mongoose.model("DiscussionPost", discussionPostSchema);

module.exports = { ChatMessage, DiscussionPost };
