const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["paid", "unpaid"],
    default: "unpaid"
  },
  datePaid: Date
});

const semesterPaymentSchema = new mongoose.Schema({
  semester: {
    type: String,
    enum: ["1st", "2nd"],
    required: true
  },
  payments: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      module: { amount: "₱1500", status: "unpaid", datePaid: null, released: false },
      tshirt: { amount: "₱350", status: "unpaid", datePaid: null, released: false },
      tenk: { amount: "₱10000", status: "unpaid", datePaid: null, released: false },
      fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null, released: false }
    })
  }
});

const schoolYearSchema = new mongoose.Schema({
  schoolYear: {
    type: String,
    required: true
  },
  semesters: [semesterPaymentSchema]
});

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["admin", "staff", "student", "assessment-coordinator"],
    required: true
  },
  username: String,
  password: String,
  usn: String,
  name: String,
  section: String,
  program: String,
  competency: {
    type: String,
    enum: ["competent", "incompetent", "pending"],
    default: undefined
  },
  competencyDate: {
    type: Date,
    default: null
  },
  profile: {
    type: String,
    default: null
  },
  // Historical payments across school years (contains all enrollments)
  schoolYears: [schoolYearSchema],
  archived: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("User", userSchema);

