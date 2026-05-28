const mongoose = require("mongoose");

const TrashItemSchema = new mongoose.Schema(
  {
    originalCollection: { type: String, required: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    deletedBy: { type: String, default: null },
    deletedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrashItem", TrashItemSchema);
