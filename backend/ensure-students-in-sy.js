const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

// Helper function to create semester entry with default payments
const createSemesterEntry = (semester) => ({
  semester,
  payments: {
    module: { amount: "₱1500", status: "unpaid" },
    tshirt: { amount: "₱350", status: "unpaid" },
    tenk: { amount: "₱10000", status: "unpaid" },
    fortyFiveHundred: { amount: "₱4500", status: "unpaid" }
  }
});

// Helper function to create school year entry
const createSchoolYearEntry = (schoolYear) => ({
  schoolYear,
  semesters: [createSemesterEntry("1st")]
});

async function ensureStudentsInSY() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Get all students
    const students = await User.find({ role: "student" });
    console.log(`📊 Found ${students.length} students\n`);

    let updated = 0;
    const currentSY = "2025-2026";

    for (const student of students) {
      if (!student.schoolYears) {
        console.log(`⚠️  Student ${student.name} (${student.usn}): Adding to ${currentSY}`);
        student.schoolYears = [createSchoolYearEntry(currentSY)];
        await student.save();
        updated++;
      } else if (!Array.isArray(student.schoolYears)) {
        console.log(`⚠️  Student ${student.name} (${student.usn}): Fixing schoolYears structure`);
        student.schoolYears = [createSchoolYearEntry(currentSY)];
        await student.save();
        updated++;
      } else {
        const hasCurrentSY = student.schoolYears.some(sy => sy.schoolYear === currentSY);
        if (!hasCurrentSY) {
          console.log(`⚠️  Student ${student.name} (${student.usn}): Adding ${currentSY}`);
          student.schoolYears.push(createSchoolYearEntry(currentSY));
          await student.save();
          updated++;
        } else {
          console.log(`✅ Student ${student.name} (${student.usn}): Already in ${currentSY}`);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Summary:`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ✅ No changes needed: ${students.length - updated}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

ensureStudentsInSY();
