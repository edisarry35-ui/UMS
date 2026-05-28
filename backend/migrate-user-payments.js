const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function migrateUserPayments() {
  console.log('Script deprecated: per-semester collections are removed in current architecture.');
  process.exit(0);
}

migrateUserPayments();

    // Define all semester collections to check
    const collections = [
      { schoolYear: "2025-2026", semester: "1st" },
      { schoolYear: "2025-2026", semester: "2nd" },
      { schoolYear: "2026-2027", semester: "1st" },
      { schoolYear: "2026-2027", semester: "2nd" }
    ];

    // Collect all unique students across collections
    const studentMap = new Map();

    for (const { schoolYear, semester } of collections) {
      try {
        const StudentModel = getStudentModel(schoolYear, semester);
        const students = await StudentModel.find({});

        for (const student of students) {
          const usn = student.usn;

          if (!studentMap.has(usn)) {
            // Create new user entry
            studentMap.set(usn, {
              role: 'student',
              usn: student.usn,
              name: student.name,
              section: student.section,
              program: student.program,
              schoolYear: schoolYear, // Set current as the latest
              semester: semester,
              schoolYears: []
            });
          }

          // Add semester data to schoolYears
          const userData = studentMap.get(usn);
          let schoolYearEntry = userData.schoolYears.find(sy => sy.schoolYear === schoolYear);

          if (!schoolYearEntry) {
            schoolYearEntry = {
              schoolYear: schoolYear,
              semesters: []
            };
            userData.schoolYears.push(schoolYearEntry);
          }

          // Add semester payments
          schoolYearEntry.semesters.push({
            semester: semester,
            payments: {
              module: student.payments?.module || { amount: "₱1500", status: "unpaid" },
              tshirt: student.payments?.tshirt || { amount: "₱350", status: "unpaid" },
              tenk: student.payments?.tenk || { amount: "₱10000", status: "unpaid" },
              fortyFiveHundred: student.payments?.fortyFiveHundred || { amount: "₱4500", status: "unpaid" }
            }
          });
        }
      } catch (err) {
        console.log(`Skipping ${getStudentCollectionName(schoolYear, semester)}: ${err.message}`);
      }
    }

    // Now create User documents
    const usersToCreate = Array.from(studentMap.values());
    console.log(`Found ${usersToCreate.length} unique students to migrate`);

    for (const userData of usersToCreate) {
      // Check if user already exists
      const existingUser = await User.findOne({ usn: userData.usn });
      if (existingUser) {
        console.log(`User ${userData.usn} already exists, updating...`);
        existingUser.schoolYears = userData.schoolYears;
        existingUser.markModified('schoolYears');
        await existingUser.save();
      } else {
        const newUser = new User(userData);
        await newUser.save();
        console.log(`Created user ${userData.usn} (${userData.name})`);
      }
    }

    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateUserPayments();