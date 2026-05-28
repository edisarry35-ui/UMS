const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  username: { type: String, default: "System" },
  role: { type: String, default: "system" },
  action: { type: String, required: true },
  category: { type: String, default: "general" },
  details: { type: String, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
