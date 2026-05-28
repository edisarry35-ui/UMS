const mongoose = require('mongoose');
const db = require('./config/db');

(async () => {
  await db();
  const conn = mongoose.connection;
  const students = await conn.db.collection('students').find({ role: 'student' }).toArray();
  console.log('total students', students.length);
  students.forEach((s) => {
    console.log(`${s.usn}: ${s.name} - ${s.schoolYear} - ${s.semester} - paymentsPerSemester keys: ${Object.keys(s.paymentsPerSemester || {}).join(',')}`);
  });
  process.exit(0);
})();