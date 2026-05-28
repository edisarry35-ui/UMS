const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function inspectStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get all students
    const students = await User.find({ role: "student" });
    console.log(`\n📊 Found ${students.length} students in database\n`);

    students.forEach((student, idx) => {
      console.log(`\n[Student ${idx + 1}]`);
      console.log(`  ID: ${student._id}`);
      console.log(`  USN: ${student.usn}`);
      console.log(`  Name: ${student.name}`);
      console.log(`  Program: ${student.program}`);
      console.log(`  Section: ${student.section}`);
      
      if (!student.schoolYears) {
        console.log(`  ⚠️  schoolYears: MISSING`);
      } else if (!Array.isArray(student.schoolYears)) {
        console.log(`  ⚠️  schoolYears: NOT AN ARRAY (type: ${typeof student.schoolYears})`);
      } else if (student.schoolYears.length === 0) {
        console.log(`  ⚠️  schoolYears: EMPTY ARRAY`);
      } else {
        console.log(`  ✅ schoolYears: ${student.schoolYears.length} entries`);
        student.schoolYears.forEach((sy, sidx) => {
          console.log(`     [${sidx}] ${sy.schoolYear} - ${sy.semesters?.length || 0} semesters`);
        });
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("Summary:");
    const withSchoolYears = students.filter(s => s.schoolYears && Array.isArray(s.schoolYears) && s.schoolYears.length > 0).length;
    const withoutSchoolYears = students.length - withSchoolYears;
    console.log(`✅ Students with schoolYears: ${withSchoolYears}`);
    console.log(`⚠️  Students without schoolYears: ${withoutSchoolYears}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

inspectStudents();
