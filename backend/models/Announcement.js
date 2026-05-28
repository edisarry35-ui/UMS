const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const CommentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    replies: { type: [ReplySchema], default: [] }
  },
  { _id: true }
);

const LikeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    reactedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true }, // username/name of the staff who posted
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // user ID of the staff who posted
    role: { type: String, enum: ["staff", "admin"], required: true },
    image: { type: String, default: null },
    photo: { type: String, default: null },
    status: { type: String, enum: ["draft", "pending", "approved", "rejected"], default: "pending" },
    approvedBy: { type: String, default: null }, // admin username
    approvalDate: { type: Date, default: null },
    likes: { type: [LikeSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },
    archived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", AnnouncementSchema);
