const mongoose = require('mongoose');
require('dotenv').config();
const db = require('./config/db');

(async () => {
  try {
    await db();
    console.log('✅ Connected to MongoDB\n');

    const firstSemCollections = [
      { schoolYear: '2025-2026', semester: '1st' },
      { schoolYear: '2026-2027', semester: '1st' }
    ];

    for (const { schoolYear, semester } of firstSemCollections) {
      const collectionName = `students_${semester}_${schoolYear}`;
      console.log(`🧹 Cleaning ${collectionName}...\n`);

      const collection = mongoose.connection.db.collection(collectionName);
      
      // Get all students
      const students = await collection.find({}).toArray();
      console.log(`Found ${students.length} students\n`);

      // Remove sem2 from all students in 1st semester collections
      const result = await collection.updateMany(
        {},
        { $unset: { 'paymentsPerSemester.sem2': '' } }
      );

      console.log(`✅ Removed sem2 from ${result.modifiedCount} students`);

      // Verify
      const sample = await collection.findOne({});
      if (sample && sample.paymentsPerSemester) {
        console.log(`   Sample student paymentsPerSemester keys:`, Object.keys(sample.paymentsPerSemester));
      }
      console.log();
    }

    console.log('✅ Cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
