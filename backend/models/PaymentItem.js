const mongoose = require("mongoose");

const PaymentItemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  schoolYear: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: String,
    enum: ["1st", "2nd"],
    required: true
  },
  releaseEnabled: {
    type: Boolean,
    default: false
  },
  released: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

PaymentItemSchema.index({ type: 1, schoolYear: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("PaymentItem", PaymentItemSchema);
