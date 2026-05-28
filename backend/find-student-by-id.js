const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

async function findStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // The ID from the error
    const studentId = "69cfc68fc95c5e6cd4030e97";
    console.log(`Looking for student with ID: ${studentId}\n`);

    // Try to find it
    const student = await User.findById(studentId);
    
    if (!student) {
      console.log("❌ Student NOT found in database");
      
      // List all users to see what exists
      console.log("\nAll users in database:");
      const allUsers = await User.find({});
      allUsers.forEach((u, idx) => {
        console.log(`[${idx}] ID: ${u._id}, Role: ${u.role}, Name: ${u.name || u.username}`);
      });
    } else {
      console.log("✅ Student found!");
      console.log(`   Name: ${student.name}`);
      console.log(`   USN: ${student.usn}`);
      console.log(`   Role: ${student.role}`);
      console.log(`   schoolYears: ${student.schoolYears ? student.schoolYears.length : 'MISSING'}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

findStudent();
