require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./sockets");

const PORT = process.env.PORT || 5000;
const MAX_PORT_ATTEMPTS = 20;

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set("io", io);

const startServer = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy, trying ${nextPort}...`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`\n🚀 LevelUp Campus server running on port ${port}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🌐 URL: http://localhost:${port}\n`);
  });
};

startServer(PORT);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err.message);
  server.close(() => process.exit(1));
});
