const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function removeRedundantFields() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caps_db';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Remove schoolYear and semester fields from all student documents using native MongoDB
    const collection = mongoose.connection.db.collection('users');
    const result = await collection.updateMany(
      { role: 'student' },
      { 
        $unset: { 
          schoolYear: '',
          semester: ''
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} student document(s)`);
    console.log(`   Removed redundant schoolYear and semester fields`);

    // Verify the removal
    const students = await User.find({ role: 'student' }).lean();
    if (students.length > 0) {
      const sample = students[0];
      console.log('\nSample student document after cleanup:');
      console.log({
        usn: sample.usn,
        name: sample.name,
        program: sample.program,
        section: sample.section,
        hasSchoolYears: !!sample.schoolYears,
        schoolYearsCount: sample.schoolYears?.length || 0,
        keys: Object.keys(sample).filter(k => !k.startsWith('_'))
      });
    }

    console.log('\nMigration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

removeRedundantFields();
