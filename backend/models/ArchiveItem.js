const mongoose = require("mongoose");

const ArchiveItemSchema = new mongoose.Schema(
  {
    originalCollection: { type: String, required: true },
    originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    archivedBy: { type: String, default: null },
    archivedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ArchiveItem", ArchiveItemSchema);
