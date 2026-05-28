const mongoose = require("mongoose");

const PaymentDeadlineSchema = new mongoose.Schema(
  {
    schoolYear: { type: String, required: true },
    semester: { type: String, required: true, enum: ["1st", "2nd"] },
    deadlineDate: { type: Date, required: true },
    notificationDays: { type: Number, default: 7 }, // Days before deadline to send notification
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, default: "" }
  },
  { timestamps: true }
);

// Ensure only one active deadline per school year and semester
PaymentDeadlineSchema.index({ schoolYear: 1, semester: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model("PaymentDeadline", PaymentDeadlineSchema);