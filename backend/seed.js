const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Program = require("./models/Program");
const { normalizeSchoolYear, normalizeSemester } = require("./models/StudentModel");

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/caps_db");
    console.log("✅ Connected to MongoDB");

    // Clear existing admin/staff users only (keep collection, remove docs)
    await User.deleteMany({ role: { $in: ["admin", "staff"] } });
    await require("./models/SchoolYear").deleteMany({});
    await Program.deleteMany({});
    console.log("🗑️  Cleared existing admin/staff users, programs, and school years");

    // Hash passwords
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    const hashedStaffPassword = await bcrypt.hash("staff123", 10);

    // Create school years with separate documents for each semester
    const SchoolYear = require("./models/SchoolYear");
    const schoolYears = await SchoolYear.insertMany([
      {
        year: "2025-2026",
        semester: "1st",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-12-31"),
        isActive: true,
        enrollmentCount: 3
      },
      {
        year: "2025-2026",
        semester: "2nd",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-05-31"),
        isActive: false,
        enrollmentCount: 0
      }
    ]);

    // Create admin and staff (stored in User collection)
    const adminUser = {
      role: "admin",
      username: "admin1",
      password: hashedAdminPassword,
      name: "Admin User"
    };
    const staffUser = {
      role: "staff",
      username: "staff1",
      password: hashedStaffPassword,
      name: "Staff User"
    };

    await User.insertMany([adminUser, staffUser]);
    console.log("✅ Admin and staff users created in User collection");

    // Create three students under 1st semester 2025-2026
    const students1stSem = [
      {
        role: "student",
        usn: "USN101",
        name: "Disa Mae Columnas",
        program: "WADT",
        section: "WADT 3D",
        schoolYear: "2025-2026",
        semester: "1st",
        paymentsPerSemester: {
          sem1: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          },
          sem2: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          }
        }
      },
      {
        role: "student",
        usn: "USN102",
        name: "Jane Marie Santos",
        program: "WADT",
        section: "WADT 3D",
        schoolYear: "2025-2026",
        semester: "1st",
        paymentsPerSemester: {
          sem1: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          },
          sem2: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          }
        }
      },
      {
        role: "student",
        usn: "USN103",
        name: "Michael James Rodriguez",
        program: "WADT",
        section: "WADT 3D",
        schoolYear: "2025-2026",
        semester: "1st",
        paymentsPerSemester: {
          sem1: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          },
          sem2: {
            module: { amount: "₱1500", status: "unpaid", datePaid: null },
            tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
            tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
            fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
          }
        }
      }
    ];

    // Insert students into User collection with schoolYears structure
    const seedStudents = students1stSem.map(student => ({
      role: "student",
      usn: student.usn,
      name: student.name,
      program: student.program,
      section: student.section,
      schoolYears: [
        {
          schoolYear: normalizeSchoolYear("2025-2026"),
          semesters: [
            {
              semester: "1st",
              payments: {
                module: { amount: "₱1500", status: "unpaid" },
                tshirt: { amount: "₱350", status: "unpaid" },
                tenk: { amount: "₱10000", status: "unpaid" },
                fortyFiveHundred: { amount: "₱4500", status: "unpaid" }
              }
            }
          ]
        }
      ]
    }));

    await User.insertMany(seedStudents);
    console.log("✅ Students created in User collection with schoolYears structure");

    // Seed default programs with their sections inside Program.sections
    await Program.insertMany([
      // 1st Semester Programs
      {
        name: "WADT",
        schoolYear: "2025-2026",
        semester: "1st",
        sections: ["WADT 3A", "WADT 3B", "WADT 3C", "WADT 3D", "WADT 3E"],
        description: "Web and Application Development Technology"
      },
      {
        name: "HRT",
        schoolYear: "2025-2026",
        semester: "1st",
        sections: ["HRT 3A", "HRT 3B", "HRT 3C", "HRT 3D"],
        description: "Hotel and Restaurant Technology"
      },
      {
        name: "OAT",
        schoolYear: "2025-2026",
        semester: "1st",
        sections: ["OAT 3A", "OAT 3B", "OAT 3C", "OAT 3D"],
        description: "Office Administration Technology"
      },
      {
        name: "OMT",
        schoolYear: "2025-2026",
        semester: "1st",
        sections: ["OMT 3A", "OMT 3B", "OMT 3C", "OMT 3D"],
        description: "Operations Management Technology"
      },
      // 2nd Semester Programs
      {
        name: "WADT",
        schoolYear: "2025-2026",
        semester: "2nd",
        sections: ["WADT 3A", "WADT 3B", "WADT 3C", "WADT 3D", "WADT 3E"],
        description: "Web and Application Development Technology"
      },
      {
        name: "HRT",
        schoolYear: "2025-2026",
        semester: "2nd",
        sections: ["HRT 3A", "HRT 3B", "HRT 3C", "HRT 3D"],
        description: "Hotel and Restaurant Technology"
      },
      {
        name: "OAT",
        schoolYear: "2025-2026",
        semester: "2nd",
        sections: ["OAT 3A", "OAT 3B", "OAT 3C", "OAT 3D"],
        description: "Office Administration Technology"
      },
      {
        name: "OMT",
        schoolYear: "2025-2026",
        semester: "2nd",
        sections: ["OMT 3A", "OMT 3B", "OMT 3C", "OMT 3D"],
        description: "Operations Management Technology"
      }
    ]);
    console.log("✅ Default programs with sections added successfully (1st & 2nd semester)");

    console.log("\n📋 Test Credentials:");
    console.log("Admin - Username: admin1 | Password: admin123");
    console.log("Staff - Username: staff1 | Password: staff123");
    console.log("\n👥 Students in collection 'students_1st_2025-2026':");
    console.log("Student - USN: USN101 | Name: Disa Mae Columnas | program: WADT | Section: WADT 3D");
    console.log("Student - USN: USN102 | Name: Jane Marie Santos | program: WADT | Section: WADT 3D");
    console.log("Student - USN: USN103 | Name: Michael James Rodriguez | program: WADT | Section: WADT 3D");

    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error seeding database:", err.message);
    process.exit(1);
  }
};

seedDatabase();



