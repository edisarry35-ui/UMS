const mongoose = require('mongoose');
require('dotenv').config();
const db = require('./config/db');

(async () => {
  try {
    await db();
    console.log('✅ Connected to MongoDB\n');

    const connections = [
      { schoolYear: '2025-2026', semester: '1st' },
      { schoolYear: '2026-2027', semester: '1st' }
    ];

    for (const { schoolYear, semester } of connections) {
      const collectionName = `students_${semester}_${schoolYear}`;
      console.log(`📝 Updating ${collectionName}...\n`);

      const collection = mongoose.connection.db.collection(collectionName);
      
      // Get all students in this collection
      const students = await collection.find({}).toArray();
      console.log(`Found ${students.length} students\n`);

      for (const student of students) {
        // Create the desired payment structure
        const updatedPayments = {
          sem1: {
            module: {
              amount: '₱1500',
              status: 'paid',
              datePaid: new Date('2026-03-27T08:20:20.376Z')
            },
            tshirt: {
              amount: '₱350',
              status: 'paid',
              datePaid: new Date('2026-03-27T08:20:30.762Z')
            },
            tenk: {
              amount: '₱10000',
              status: 'paid',
              datePaid: new Date('2026-03-27T08:18:45.180Z')
            },
            fortyFiveHundred: {
              amount: '₱4500',
              status: 'unpaid',
              datePaid: null
            }
          }
        };

        // Update the student document
        await collection.updateOne(
          { _id: student._id },
          { $set: { paymentsPerSemester: updatedPayments } }
        );

        console.log(`✅ Updated ${student.usn}: ${student.name}`);
      }

      console.log(`\n📊 Verification - ${collectionName}:`);
      const updatedStudents = await collection.find({}).toArray();
      updatedStudents.forEach((s) => {
        const hasSem1 = !!s.paymentsPerSemester.sem1;
        const hasSem2 = !!s.paymentsPerSemester.sem2;
        console.log(`  ${s.usn}: sem1=${hasSem1}, sem2=${hasSem2}`);
      });
      console.log();
    }

    console.log('✅ All 1st semester students updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
