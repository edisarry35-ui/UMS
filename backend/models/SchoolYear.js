const mongoose = require("mongoose");

const SchoolYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    enum: ["1st", "2nd"],
    required: true
  },
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: false },
  enrollmentCount: { type: Number, default: 0 }
});

module.exports = mongoose.model("SchoolYear", SchoolYearSchema);

