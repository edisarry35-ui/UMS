const mongoose = require('mongoose');
const db = require('./config/db');

(async () => {
  await require('dotenv').config();
  await db();
  const conn = mongoose.connection;
  const students = await conn.db.collection('students_1st_2025-2026').find({}).toArray();
  console.log('Found', students.length, 'students in students_1st_2025-2026');
  students.forEach(s => {
    console.log(`${s.usn}, sem key exists?`, s.paymentsPerSemester ? 'sem1=' + !!s.paymentsPerSemester.sem1 + ', sem2=' + !!s.paymentsPerSemester.sem2 : 'no paymentsPerSemester');
  });
  process.exit(0);
})();