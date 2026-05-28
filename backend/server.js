// server.js
require("dotenv").config(); // Load .env first

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const fileUpload = require("express-fileupload");
const User = require("./models/User");
const SchoolYear = require("./models/SchoolYear");
const Announcement = require("./models/Announcement");
const Notification = require("./models/Notification");
const Program = require("./models/Program");
const GCashAccount = require("./models/GCashAccount");
const Transaction = require("./models/Transaction");
const { checkAndSendDeadlineNotifications } = require("./utils/deadlineNotifications");

const app = express();

// Confirm MONGO_URI is loaded
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in your .env file");
  process.exit(1);
} else {
  console.log("MONGO_URI loaded successfully");
}

// Connect to MongoDB
connectDB().then(() => {
  console.log("Connected to MongoDB");
});

// Middleware
const normalizeOrigin = (url) => {
  if (!url) return null;
  return url.replace(/\/+$/, ""); // remove trailing slash(es)
};

const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL) || "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  normalizeOrigin(process.env.VERCEL_URL) ? `https://${normalizeOrigin(process.env.VERCEL_URL)}` : null,
  normalizeOrigin(process.env.VERCEL_URL) ? `http://${normalizeOrigin(process.env.VERCEL_URL)}` : null,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocked origin: ${origin} (normalized: ${normalizedOrigin})`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth routes
const authRoutes = require("./models/routes/authRoutes");

// Deadline routes
const deadlineRoutes = require("./routes/deadlineRoutes");

// Settings routes
const settingsRoutes = require("./routes/settingsRoutes");

// Direct ROOT (/) to authRoutes
app.use("/", authRoutes);

// Optional: still allow /api/auth if you want
app.use("/api/auth", authRoutes);

// Deadline routes
app.use("/api/deadlines", deadlineRoutes);

// Settings routes
app.use("/api/settings", settingsRoutes);

// Use PORT from environment (required for Render)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`FRONTEND_URL env: ${process.env.FRONTEND_URL || 'not set'}`);
});

const cleanupTrash = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [announcementResult, notificationResult, programResult, userResult, gcashResult, transactionResult] = await Promise.all([
      Announcement.deleteMany({ deletedAt: { $lte: cutoff } }),
      Notification.deleteMany({ deletedAt: { $lte: cutoff } }),
      Program.deleteMany({ deletedAt: { $lte: cutoff } }),
      User.deleteMany({ deletedAt: { $lte: cutoff } }),
      GCashAccount.deleteMany({ deletedAt: { $lte: cutoff } }),
      Transaction.deleteMany({ deletedAt: { $lte: cutoff } })
    ]);
    console.log(`Trash cleanup completed: ${announcementResult.deletedCount} announcements, ${notificationResult.deletedCount} notifications, ${programResult.deletedCount} programs, ${userResult.deletedCount} users, ${gcashResult.deletedCount} gcash accounts, ${transactionResult.deletedCount} transactions removed.`);
  } catch (error) {
    console.error("Scheduled trash cleanup failed:", error);
  }
};

const archiveOldNotifications = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Notification.updateMany(
      { archived: { $ne: true }, deletedAt: null, createdAt: { $lte: cutoff } },
      { $set: { archived: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Archived ${result.modifiedCount} notifications older than 30 days.`);
    }
  } catch (error) {
    console.error("Scheduled notification archive failed:", error);
  }
};

// Schedule deadline notification checks (run every 24 hours)
setInterval(async () => {
  try {
    await checkAndSendDeadlineNotifications();
  } catch (error) {
    console.error("Scheduled deadline notification check failed:", error);
  }
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

// Schedule trash cleanup every 24 hours
setInterval(async () => {
  await cleanupTrash();
}, 24 * 60 * 60 * 1000);

// Schedule notification archiving every 24 hours
setInterval(async () => {
  await archiveOldNotifications();
}, 24 * 60 * 60 * 1000);

// Also run once on startup (after a short delay to ensure DB connection)
setTimeout(async () => {
  try {
    await checkAndSendDeadlineNotifications();
    await cleanupTrash();
    await archiveOldNotifications();
    console.log("Initial deadline notification check completed");
  } catch (error) {
    console.error("Initial deadline notification check failed:", error);
  }
}, 10000); // 10 seconds after startup
