const mongoose = require("mongoose");
const db = require("./config/db");

// Define Student schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const StudentModel = mongoose.model("Student", studentSchema);

async function cleanupSemester2() {
  try {
    console.log("🧹 Starting payment structure cleanup...\n");

    // Connect to database
    await db();
    console.log("✅ Connected to MongoDB\n");

    // Get all semester collections
    const connection = mongoose.connection;
    const collections = await connection.db.listCollections().toArray();
    const studentCollections = collections
      .map(c => c.name)
      .filter(name => name.startsWith("students_"));

    console.log(`📦 Found ${studentCollections.length} student collections:\n`);

    for (const collectionName of studentCollections) {
      console.log(`\n📝 Processing: ${collectionName}`);
      
      const StudentCollection = mongoose.model(
        collectionName,
        studentSchema,
        collectionName
      );

      // Check if this is a 1st semester collection or 2nd semester collection
      const isSemester1 = collectionName.includes("1st");
      const isSemester2 = collectionName.includes("2nd");

      if (isSemester1) {
        // For 1st semester students: remove sem2
        const result = await StudentCollection.updateMany(
          {},
          { $unset: { "paymentsPerSemester.sem2": 1 } }
        );
        console.log(`   ✅ Removed sem2 from ${result.modifiedCount} students`);
        
        // Verify the update
        const sample = await StudentCollection.findOne({});
        if (sample) {
          const hasOnlySem1 = sample.paymentsPerSemester.sem1 && !sample.paymentsPerSemester.sem2;
          console.log(`   ✓ Verified: ${hasOnlySem1 ? "Only sem1 payments" : "ERROR: Still has sem2"}`);
        }
      } else if (isSemester2) {
        // For 2nd semester students: remove sem1
        const result = await StudentCollection.updateMany(
          {},
          { $unset: { "paymentsPerSemester.sem1": 1 } }
        );
        console.log(`   ✅ Removed sem1 from ${result.modifiedCount} students`);
        
        // Verify the update
        const sample = await StudentCollection.findOne({});
        if (sample) {
          const hasOnlySem2 = sample.paymentsPerSemester.sem2 && !sample.paymentsPerSemester.sem1;
          console.log(`   ✓ Verified: ${hasOnlySem2 ? "Only sem2 payments" : "ERROR: Still has sem1"}`);
        }
      }
    }

    console.log("\n\n📊 Final verification - showing sample records:\n");
    
    for (const collectionName of studentCollections) {
      const StudentCollection = mongoose.model(
        collectionName,
        studentSchema,
        collectionName
      );

      const count = await StudentCollection.countDocuments();
      if (count > 0) {
        const sample = await StudentCollection.findOne({});
        console.log(`${collectionName}:`);
        console.log(`  Students: ${count}`);
        console.log(`  Payment structure:`, {
          hasSem1: !!sample.paymentsPerSemester.sem1,
          hasSem2: !!sample.paymentsPerSemester.sem2,
        });
        console.log();
      }
    }

    console.log("✅ Cleanup complete!\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
    process.exit(1);
  }
}

cleanupSemester2();
