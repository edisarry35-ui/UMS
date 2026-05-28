/**
 * Cleanup script to remove all existing payment items from students' records
 * Keeps the payments structure intact but empty
 * This allows the system to start fresh with admin-created items from PaymentItem collection
 */

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const cleanupPayments = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/caps_db";
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Update all users - set payments to empty object for all semesters
    const result = await User.updateMany(
      {},
      [
        {
          $set: {
            schoolYears: {
              $map: {
                input: '$schoolYears',
                as: 'schoolYear',
                in: {
                  $mergeObjects: [
                    '$$schoolYear',
                    {
                      semesters: {
                        $map: {
                          input: '$$schoolYear.semesters',
                          as: 'semester',
                          in: {
                            $mergeObjects: [
                              '$$semester',
                              {
                                payments: {} // Empty payments object
                              }
                            ]
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );

    console.log(`\n✅ Cleanup successful!`);
    console.log(`Updated ${result.modifiedCount} users`);
    console.log(`All payment items have been removed from student records`);
    console.log(`Payment structure preserved - ready for admin-created items\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

cleanupPayments();