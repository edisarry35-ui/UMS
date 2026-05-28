const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function fixStudentSchoolYears() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get all students
    const students = await User.find({ role: "student" });
    console.log(`\n📊 Found ${students.length} students\n`);

    let updated = 0;
    let alreadyHave = 0;

    for (const student of students) {
      if (!student.schoolYears) {
        console.log(`⚠️  Student ${student.name} (${student.usn}) - MISSING schoolYears, adding empty array`);
        student.schoolYears = [];
        await student.save();
        updated++;
      } else if (!Array.isArray(student.schoolYears)) {
        console.log(`⚠️  Student ${student.name} (${student.usn}) - schoolYears is not an array, fixing...`);
        student.schoolYears = [];
        await student.save();
        updated++;
      } else if (student.schoolYears.length === 0) {
        console.log(`⚠️  Student ${student.name} (${student.usn}) - has empty schoolYears array`);
        alreadyHave++;
      } else {
        console.log(`✅ Student ${student.name} (${student.usn}) - has ${student.schoolYears.length} school years`);
        alreadyHave++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Summary:`);
    console.log(`  ✅ Students with schoolYears: ${alreadyHave}`);
    console.log(`  ⚠️  Students fixed: ${updated}`);

    if (updated > 0) {
      console.log(`\n✨ Fixed ${updated} student(s)`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

fixStudentSchoolYears();
