const express = require("express");
const cors = require("cors");
const path = require("path");
const { rateLimit } = require("express-rate-limit");

const app = express();
const frontendPath = path.resolve(__dirname, "../../../Fronted");

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: false,
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(frontendPath));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", globalLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ success: true, message: "LevelUp Campus API is running 🎮", timestamp: new Date() });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",        require("./routes/auth.routes"));
app.use("/api/dashboard",   require("./routes/dashboard.routes"));
app.use("/api/leaderboard", require("./routes/leaderboard.routes"));
app.use("/api/community",   require("./routes/community.routes"));
app.use("/api/rewards",     require("./routes/rewards.routes"));
app.use("/api/levels",      require("./routes/levels.routes"));
app.use("/api/xp",          require("./routes/xp.routes"));
app.use("/api/ai",          require("./routes/ai.routes"));

app.get("/", (req, res) => {
  res.redirect("/Login.html");
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
