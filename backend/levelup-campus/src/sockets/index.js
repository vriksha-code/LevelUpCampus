const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ChatMessage } = require("../models/Community");
const { awardXP } = require("../services/xp.service");

// Track connected users: userId -> socketId
const connectedUsers = new Map();

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "levelup-campus-dev-secret";
  }

  throw new Error("JWT_SECRET is not configured.");
};

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  // ─── JWT Auth Middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, getJwtSecret());
      const user    = await User.findById(decoded.id).select("name avatar currentLevel levelTitle isVerified");

      if (!user || !user.isVerified) return next(new Error("User not found or not verified"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const user = socket.user;
    connectedUsers.set(user._id.toString(), socket.id);

    console.log(`🟢 Socket connected: ${user.name} (${socket.id})`);

    // Emit online count
    io.emit("online_count", connectedUsers.size);

    // ─── Join a room ────────────────────────────────────────────────────────
    socket.on("join_room", async ({ room }) => {
      const validRooms = ["general", "peer-help", "announcements", "random"];
      const targetRoom = validRooms.includes(room) ? room : "general";

      socket.join(targetRoom);
      socket.currentRoom = targetRoom;

      // Send last 30 messages to the joining user
      const history = await ChatMessage.find({ room: targetRoom })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("sender", "name avatar currentLevel levelTitle");

      socket.emit("chat_history", { room: targetRoom, messages: history.reverse() });

      // Announce join
      socket.to(targetRoom).emit("system_message", {
        content: `${user.name} joined #${targetRoom}`,
        timestamp: new Date(),
      });
    });

    // ─── Send message ────────────────────────────────────────────────────────
    // payload: { content, room, replyTo, messageType }
    socket.on("send_message", async ({ content, room, replyTo, messageType = "normal" }) => {
      try {
        if (!content || content.trim().length === 0) return;
        if (content.length > 1000) {
          return socket.emit("error", { message: "Message too long (max 1000 chars)" });
        }

        const validRooms = ["general", "peer-help", "announcements", "random"];
        const targetRoom = validRooms.includes(room) ? room : (socket.currentRoom || "general");

        const messagePayload = {
          sender:  user._id,
          room:    targetRoom,
          content: content.trim(),
          messageType: messageType === "question" ? "question" : (messageType === "answer" ? "answer" : "normal"),
        };

        if (replyTo) {
          messagePayload.replyTo = {
            messageId: replyTo.messageId || null,
            senderName: replyTo.senderName || "",
            content: replyTo.content || "",
          };
        }

        // If posting a question, set questionOwner
        if (messagePayload.messageType === "question") {
          messagePayload.questionOwner = user._id;
        }

        const message = await ChatMessage.create(messagePayload);

        const populated = await message.populate("sender", "name avatar currentLevel levelTitle");

        // Broadcast to all in room (including sender)
        io.to(targetRoom).emit("new_message", {
          id:        populated._id,
          sender: {
            id:           user._id,
            name:         user.name,
            avatar:       user.avatar,
            currentLevel: user.currentLevel,
            levelTitle:   user.levelTitle,
          },
          content:   populated.content,
          room:      targetRoom,
          timestamp: populated.createdAt,
          replyTo:   populated.replyTo || null,
          messageType: populated.messageType,
          isSolved: populated.isSolved || false,
        });

        // Award XP for chat participation (once per 10 messages)
        const userMsgCount = await ChatMessage.countDocuments({ sender: user._id });
        if (userMsgCount % 10 === 0) {
          await awardXP(user._id, 5, "community", "Active chat participant");
        }
      } catch (err) {
        console.error("Socket send_message error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─── Reply to a message (answer) ─────────────────────────────────────────
    socket.on("reply_message", async ({ content, room, originalMessageId }) => {
      try {
        if (!content || !content.trim()) return;
        const targetRoom = room || socket.currentRoom || "general";

        const original = await ChatMessage.findById(originalMessageId).populate("sender", "name");
        const replyToPayload = original ? {
          messageId: original._id,
          senderName: original.sender ? original.sender.name : "",
          content: original.content || "",
        } : undefined;

        const replyMsg = await ChatMessage.create({
          sender: user._id,
          room: targetRoom,
          content: content.trim(),
          messageType: "answer",
          replyTo: replyToPayload,
        });

        const populatedReply = await replyMsg.populate("sender", "name avatar currentLevel levelTitle");

        io.to(targetRoom).emit("reply_message", {
          id: populatedReply._id,
          sender: { id: user._id, name: user.name, avatar: user.avatar },
          content: populatedReply.content,
          room: targetRoom,
          timestamp: populatedReply.createdAt,
          replyTo: populatedReply.replyTo,
        });
      } catch (err) {
        console.error("Socket reply_message error:", err);
        socket.emit("error", { message: "Failed to send reply" });
      }
    });

    // ─── Mark question as solved ─────────────────────────────────────────────
    socket.on("mark_solved", async ({ messageId }) => {
      try {
        const msg = await ChatMessage.findById(messageId);
        if (!msg) return socket.emit("error", { message: "Message not found" });
        if (String(msg.questionOwner) !== String(user._id)) {
          return socket.emit("error", { message: "Only the question owner can mark solved" });
        }
        msg.isSolved = true;
        await msg.save();

        io.to(msg.room).emit("mark_solved", { messageId: msg._id, solved: true, solvedBy: { id: user._id, name: user.name } });
      } catch (err) {
        console.error("Socket mark_solved error:", err);
        socket.emit("error", { message: "Failed to mark solved" });
      }
    });

    // ─── Typing indicator ────────────────────────────────────────────────────
    socket.on("typing_start", ({ room }) => {
      socket.to(room || socket.currentRoom).emit("user_typing", {
        userId: user._id,
        name:   user.name,
      });
    });

    socket.on("typing_stop", ({ room }) => {
      socket.to(room || socket.currentRoom).emit("user_stopped_typing", {
        userId: user._id,
      });
    });

    // ─── Leave room ──────────────────────────────────────────────────────────
    socket.on("leave_room", ({ room }) => {
      socket.leave(room);
      socket.to(room).emit("system_message", {
        content:   `${user.name} left #${room}`,
        timestamp: new Date(),
      });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      connectedUsers.delete(user._id.toString());
      console.log(`🔴 Socket disconnected: ${user.name}`);
      io.emit("online_count", connectedUsers.size);
    });
  });

  console.log("🔌 Socket.IO initialized");
  return io;
};

module.exports = initSocket;
