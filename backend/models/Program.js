const mongoose = require("mongoose");

const ProgramSchema = new mongoose.Schema({
  name: {
    type: String,
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
  sections: [
    {
      type: String,
      required: true
    }
  ],
  description: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  archived: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("Program", ProgramSchema);
