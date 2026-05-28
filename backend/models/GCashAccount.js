const mongoose = require("mongoose");

const GCashAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
  qrImage: { type: String, default: null }, // file name path in uploads
  qrImageData: { type: Buffer, default: null }, // binary data in DB
  qrImageMimeType: { type: String, default: null },
  originalFileName: { type: String, default: null }, // original file name
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  archived: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model("GCashAccount", GCashAccountSchema);
