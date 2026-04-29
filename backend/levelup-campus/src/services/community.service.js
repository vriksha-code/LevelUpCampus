const User = require("../models/User");
const { ChatMessage } = require("../models/Community");
const { awardXP, updateStreak } = require("./xp.service");

const COMMUNITY_XP = {
  normal: 10,
  question: 20,
  answer: 50,
  accepted_answer: 100,
};

const addNotification = async (userId, notification) => {
  await User.findByIdAndUpdate(userId, {
    $push: {
      notifications: {
        ...notification,
        createdAt: notification.createdAt || new Date(),
        isRead: notification.isRead ?? false,
      },
    },
  });
};

const rewardActivityXP = async (userId, messageType, description, source = "community") => {
  const safeType = COMMUNITY_XP[messageType] ? messageType : "normal";
  await updateStreak(userId);
  return awardXP(userId, COMMUNITY_XP[safeType], source, description);
};

const createCommunityNotification = async (userId, message, data = {}, type = "system") => {
  const notification = { type, message, data, isRead: false, createdAt: new Date() };
  await addNotification(userId, notification);
  return notification;
};

const acceptAnswer = async ({ questionId, answerId, ownerId }) => {
  const question = await ChatMessage.findById(questionId);
  const answer = await ChatMessage.findById(answerId);

  if (!question || question.messageType !== "question") {
    const error = new Error("Question not found");
    error.statusCode = 404;
    throw error;
  }

  if (!answer || answer.messageType !== "answer") {
    const error = new Error("Answer not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(question.questionOwner) !== String(ownerId)) {
    const error = new Error("Only question owner can accept an answer");
    error.statusCode = 403;
    throw error;
  }

  if (String(answer.questionId) !== String(question._id)) {
    const error = new Error("Answer does not belong to this question");
    error.statusCode = 400;
    throw error;
  }

  if (question.acceptedAnswerId && String(question.acceptedAnswerId) !== String(answer._id)) {
    await ChatMessage.findByIdAndUpdate(question.acceptedAnswerId, {
      $set: { isAccepted: false, acceptedAt: null, acceptedBy: null },
    });
  }

  question.acceptedAnswerId = answer._id;
  await question.save();

  answer.isAccepted = true;
  answer.acceptedAt = new Date();
  answer.acceptedBy = ownerId;
  await answer.save();

  return { question, answer };
};

module.exports = {
  COMMUNITY_XP,
  addNotification,
  rewardActivityXP,
  createCommunityNotification,
  acceptAnswer,
};
