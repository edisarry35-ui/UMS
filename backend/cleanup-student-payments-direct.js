const mongoose = require('mongoose');
require('dotenv').config();
const db = require('./config/db');

(async () => {
  try {
    await db();
    const conn = mongoose.connection;
    const studentCollections = ['students_1st_2025-2026','students_2nd_2025-2026','students_1st_2026-2027','students_2nd_2026-2027'];

    for (const collectionName of studentCollections) {
      const collection = conn.db.collection(collectionName);
      const isFirst = collectionName.includes('1st');
      const isSecond = collectionName.includes('2nd');
      if (!collection) {
        console.log(`${collectionName} not found`);
        continue;
      }
      if (isFirst) {
        const result = await collection.updateMany({}, { $unset: { 'paymentsPerSemester.sem2': '' } });
        console.log(`${collectionName}: sem2 unset in ${result.modifiedCount} docs`);
      } else if (isSecond) {
        const result = await collection.updateMany({}, { $unset: { 'paymentsPerSemester.sem1': '' } });
        console.log(`${collectionName}: sem1 unset in ${result.modifiedCount} docs`);
      }
      const sample = await collection.findOne();
      if (sample) {
        console.log(`${collectionName} sample paymentsPerSemester:`, sample.paymentsPerSemester);
      }
    }

    const collections = await conn.db.listCollections().toArray();
    console.log('Collection list:', collections.map(c => c.name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();