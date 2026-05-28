const mongoose = require("mongoose");

const defaultPaymentFields = {
  module: { amount: "₱1,000", status: "unpaid", datePaid: null, released: false },
  tshirt: { amount: "₱500", status: "unpaid", datePaid: null, released: false },
  tenk: { amount: "₱200", status: "unpaid", datePaid: null, released: false },
  fortyFiveHundred: { amount: "₱200", status: "unpaid", datePaid: null, released: false }
};

const cloneDefaultPaymentFields = () => ({
  module: { ...defaultPaymentFields.module },
  tshirt: { ...defaultPaymentFields.tshirt },
  tenk: { ...defaultPaymentFields.tenk },
  fortyFiveHundred: { ...defaultPaymentFields.fortyFiveHundred }
});

const mergePaymentField = (defaultField, existingField = {}) => {
  const currentAmount = String(existingField?.amount ?? "").trim();
  const hasValidAmount = currentAmount && !["₱0", "₱0.00", "0"].includes(currentAmount);

  return {
    ...defaultField,
    ...existingField,
    amount: hasValidAmount ? currentAmount : defaultField.amount
  };
};

const getSemesterPaymentKey = (semester) =>
  normalizeSemester(semester) === "2nd" ? "sem2" : "sem1";

// Student schema (same as User but without admin/staff fields)
const studentSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["student"],
    default: "student"
  },
  usn: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  section: String,
  program: String,
  schoolYear: String,
  semester: {
    type: String,
    enum: ["1st", "2nd"],
    default: "1st"
  },
  paymentsPerSemester: {
    type: mongoose.Schema.Types.Mixed,
    default: () => getDefaultPaymentsPerSemester("1st")
  }
}, { timestamps: true });

const normalizeSchoolYear = (schoolYear) => {
  if (!schoolYear) {
    throw new Error("schoolYear is required");
  }
  const value = String(schoolYear).trim();
  const match = value.match(/(\d{4}-\d{4})/);
  return match ? match[1] : value.replace(/^SY\s*/i, "").trim();
};

const normalizeSemester = (semester) => {
  if (!semester) {
    throw new Error("semester is required");
  }
  const value = String(semester).trim().toLowerCase();
  return value.startsWith("2") ? "2nd" : "1st";
};

const sanitizePaymentsPerSemester = (payments = {}, semester = "1st") => {
  const semesterKey = getSemesterPaymentKey(semester);
  const semesterPayments = payments?.[semesterKey] || {};

  return {
    [semesterKey]: {
      module: mergePaymentField(defaultPaymentFields.module, semesterPayments.module),
      tshirt: mergePaymentField(defaultPaymentFields.tshirt, semesterPayments.tshirt),
      tenk: mergePaymentField(defaultPaymentFields.tenk, semesterPayments.tenk),
      fortyFiveHundred: mergePaymentField(defaultPaymentFields.fortyFiveHundred, semesterPayments.fortyFiveHundred)
    }
  };
};

const getDefaultPaymentsPerSemester = (semester = "1st") =>
  sanitizePaymentsPerSemester({}, semester);

module.exports = {
  studentSchema,
  normalizeSchoolYear,
  normalizeSemester,
  getDefaultPaymentsPerSemester,
  sanitizePaymentsPerSemester,
  defaultPaymentFields
};

