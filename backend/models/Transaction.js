const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentUsn: {
    type: String,
    required: true
  },
  paymentType: {
    type: String,
    enum: ["module", "tshirt", "tenk", "fortyFiveHundred"],
    required: true
  },
  schoolYear: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ["1st", "2nd"],
    required: true
  },
  receiptImage: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "rejected"],
    default: "undefined"
  },
  confirmedBy: {
    type: String,
    default: null
  },
  confirmationDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  archived: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);