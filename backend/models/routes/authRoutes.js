const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const path = require("path");
const User = require("../User");
const ActivityLog = require("../ActivityLog");
const authMiddleware = require("../../middleware/AuthMiddleware");
const GCashAccount = require("../GCashAccount");
const Announcement = require("../Announcement");
const Notification = require("../Notification");
const TrashItem = require("../TrashItem");
const ArchiveItem = require("../ArchiveItem");
const SchoolYear = require("../SchoolYear");
const Program = require("../Program");
const Transaction = require("../Transaction");
const PaymentItem = require("../PaymentItem");
const { normalizeSchoolYear, normalizeSemester, defaultPaymentFields } = require("../StudentModel");
const csv = require("csv-parse/sync");

const logActivity = async ({ userId = null, username = "System", role = "system", action = "unknown", category = "general", details = "", metadata = {}, ipAddress = null, userAgent = null }) => {
  try {
    await ActivityLog.create({ userId, username, role, action, category, details, metadata, ipAddress, userAgent });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

const router = express.Router();

const getProgramSections = (program) => (
  [...new Set((program.sections || []).map((section) => String(section).trim()).filter(Boolean))]
);

const buildProgramFilter = (programName, schoolYear, semester) => {
  const filter = { name: String(programName || "").trim() };
  if (schoolYear) filter.schoolYear = normalizeSchoolYear(schoolYear);
  if (semester) filter.semester = normalizeSemester(semester);
  return filter;
};

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCompetencyValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("incompetent") || normalized.includes("not competent") || normalized === "no" || normalized === "n" || normalized === "false" || normalized === "0") return "incompetent";
  if (normalized.includes("competent") || normalized === "yes" || normalized === "y" || normalized === "true" || normalized === "1") return "competent";
  if (normalized.includes("pending")) return "pending";
  return null;
};

const filterStudentsBySchoolYearSemester = (students, schoolYear, semester) => {
  if (!schoolYear && !semester) return students;
  return students.filter((student) => {
    if (!Array.isArray(student.schoolYears)) return false;
    return student.schoolYears.some((yearEntry) => {
      const yearMatches = !schoolYear || yearEntry.schoolYear === schoolYear;
      const semesterMatches = !semester || Array.isArray(yearEntry.semesters) && yearEntry.semesters.some((semesterEntry) => semesterEntry.semester === semester);
      return yearMatches && semesterMatches;
    });
  });
};

// Create a semester entry with empty payments by default
const createSemesterEntry = (semester, payments = null) => ({
  semester,
  payments: payments || {}
});

// Create a school year entry with a semester and default payment structure
const createSchoolYearEntry = (schoolYear, semester, payments = null) => ({
  schoolYear,
  semesters: [createSemesterEntry(semester, payments)]
});

const getTypeLabel = (type) => {
  const labels = {
    announcement: "Announcement",
    notification: "Notification",
    program: "Program",
    user: "User",
    "gcash-account": "GCash Account",
    transaction: "Transaction"
  };
  return labels[type] || type;
};

const archiveOldNotifications = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Notification.updateMany(
      { archived: { $ne: true }, deletedAt: null, createdAt: { $lte: cutoff } },
      { $set: { archived: true } }
    );
  } catch (err) {
    console.error("Failed to archive old notifications:", err);
  }
};

const serializeSystemItem = (doc, type) => {
  const common = {
    _id: doc._id,
    type,
    label: getTypeLabel(type),
    archived: !!doc.archived,
    deletedAt: doc.deletedAt || null,
    createdAt: doc.createdAt || doc.createdAt,
    updatedAt: doc.updatedAt || doc.updatedAt
  };

  switch (type) {
    case "announcement":
      return {
        ...common,
        title: doc.title,
        subtitle: `Published by ${doc.author}`,
        description: doc.content
      };
    case "notification":
      return {
        ...common,
        title: doc.message,
        subtitle: doc.type ? `${doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} notification` : "Notification",
        description: doc.message
      };
    case "program":
      return {
        ...common,
        title: doc.name,
        subtitle: `${doc.schoolYear} ${doc.semester}`,
        description: doc.description || "Program details"
      };
    case "user":
      return {
        ...common,
        title: doc.name || doc.username || "User",
        subtitle: `Role: ${doc.role}`,
        description: `${doc.usn ? `USN: ${doc.usn}` : ""}${doc.program ? ` • ${doc.program}` : ""}${doc.section ? ` • ${doc.section}` : ""}`.replace(/^ • /, "")
      };
    case "gcash-account":
      return {
        ...common,
        title: doc.name,
        subtitle: `Account number: ${doc.number}`,
        description: doc.active ? "Active account" : "Inactive account"
      };
    case "transaction":
      return {
        ...common,
        title: `${doc.paymentType} payment`,
        subtitle: `${doc.studentName} • ${doc.schoolYear} ${doc.semester}`,
        description: `Status: ${doc.status}`
      };
    default:
      return {
        ...common,
        title: doc.title || doc.name || doc.username || "Item",
        subtitle: "",
        description: JSON.stringify(doc)
      };
  }
};

const getExistingStudentCollections = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections
    .map(({ name }) => {
      const match = name.match(/^(1st|2nd)_(\d{4}-\d{4})$/);
      return match ? { semester: match[1], schoolYear: match[2] } : null;
    })
    .filter(Boolean);
};

// GET / → show API status
router.get("/", (req, res) => {
  res.send("Auth API is running");
});

// POST /login → authenticate user
router.post("/login", async (req, res) => {
  const { role, username, password, usn, name, identifier, secret } = req.body;

  try {
    let user;

    if (role === "student") {
      if (!usn || !name) {
        return res.status(400).json({ message: "USN and name required for student login" });
      }

      const trimmedUsn = String(usn).trim();
      const trimmedName = String(name).trim();

      // First try: exact full name match
      const exactNameRegex = new RegExp(`^${escapeRegExp(trimmedName)}$`, "i");
      user = await User.findOne({ usn: trimmedUsn, name: exactNameRegex, role: 'student', deletedAt: null });

      // Second try: first name match (in case user enters just first name)
      if (!user) {
        const firstNameRegex = new RegExp(`^${escapeRegExp(trimmedName)}\\s|^${escapeRegExp(trimmedName)}$`, "i");
        user = await User.findOne({ usn: trimmedUsn, name: firstNameRegex, role: 'student', deletedAt: null });
      }

      // Third try: contains name match (partial match anywhere)
      if (!user) {
        const containsNameRegex = new RegExp(escapeRegExp(trimmedName), "i");
        user = await User.findOne({ usn: trimmedUsn, name: containsNameRegex, role: 'student', deletedAt: null });
      }
    } else if (role === "staff" || role === "admin") {
      const trimmedUsername = String(username || "").trim();
      const trimmedPassword = String(password || "");
      if (!trimmedUsername || !trimmedPassword) {
        return res.status(400).json({ message: "Username and password are required for staff/admin login" });
      }

      const usernameRegex = new RegExp(`^${escapeRegExp(trimmedUsername)}$`, "i");
      user = await User.findOne({
        username: usernameRegex,
        role: { $in: ["staff", "admin", "assessment-coordinator"] },
        deletedAt: null,
      });

      if (user) {
        let passwordMatches = false;
        try {
          passwordMatches = await bcrypt.compare(trimmedPassword, user.password);
        } catch (e) {
          // If bcrypt.compare throws (malformed hash) fall back to direct comparison
          passwordMatches = trimmedPassword === user.password;
        }

        // If stored password was plain-text and matches, migrate to hashed password
        if (!passwordMatches && trimmedPassword === user.password) {
          try {
            user.password = await bcrypt.hash(trimmedPassword, 10);
            await user.save();
            passwordMatches = true;
          } catch (err) {
            console.error("Failed to migrate plaintext password to bcrypt:", err);
          }
        }

        if (!passwordMatches) {
          user = null;
        }
      }
    } else if (identifier && secret) {
      const trimmedIdentifier = String(identifier).trim();
      const trimmedSecret = String(secret).trim();

      // First, try staff/admin/assessment-coordinator login using username + password
      const usernameRegex = new RegExp(`^${escapeRegExp(trimmedIdentifier)}$`, "i");
      user = await User.findOne({ username: usernameRegex, deletedAt: null });

      if (user) {
        let passwordMatches = false;
        try {
          passwordMatches = await bcrypt.compare(trimmedSecret, user.password);
        } catch (e) {
          passwordMatches = trimmedSecret === user.password;
        }

        if (!passwordMatches && trimmedSecret === user.password) {
          try {
            user.password = await bcrypt.hash(trimmedSecret, 10);
            await user.save();
            passwordMatches = true;
          } catch (err) {
            console.error("Failed to migrate plaintext password to bcrypt:", err);
          }
        }

        if (!passwordMatches) {
          user = null;
        }
      }

      // If not a staff/admin login, try student login: name (identifier) + usn (secret)
      if (!user) {
        const exactNameRegex = new RegExp(`^${escapeRegExp(trimmedIdentifier)}$`, "i");
        user = await User.findOne({ usn: trimmedSecret, name: exactNameRegex, role: 'student', deletedAt: null });

        if (!user) {
          const firstNameRegex = new RegExp(`^${escapeRegExp(trimmedIdentifier)}\\s|^${escapeRegExp(trimmedIdentifier)}$`, "i");
          user = await User.findOne({ usn: trimmedSecret, name: firstNameRegex, role: 'student', deletedAt: null });
        }

        if (!user) {
          const containsNameRegex = new RegExp(escapeRegExp(trimmedIdentifier), "i");
          user = await User.findOne({ usn: trimmedSecret, name: containsNameRegex, role: 'student', deletedAt: null });
        }
      }
    } else {
      return res.status(400).json({ message: "Invalid login request" });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Do not record user login actions in the activity log
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /students → get all students for a specific semester and schoolYear
router.get("/students", async (req, res) => {
  try {
    const { schoolYear, semester } = req.query;

    // Get all students from User collection
    const allStudents = await User.find({ role: 'student', deletedAt: null });

    // Filter students by schoolYear and/or semester if provided
    if (schoolYear || semester) {
      const normalizedSchoolYear = schoolYear ? normalizeSchoolYear(schoolYear) : null;
      const normalizedSemester = semester ? normalizeSemester(semester) : null;

      const filteredStudents = allStudents.filter(student => {
        if (!student.schoolYears) return false;
        return student.schoolYears.some((sy) => {
          const yearMatches = normalizedSchoolYear ? sy.schoolYear === normalizedSchoolYear : true;
          const semesterMatches = normalizedSemester
            ? sy.semesters.some((sem) => sem.semester === normalizedSemester)
            : true;
          return yearMatches && semesterMatches;
        });
      });

      return res.json(filteredStudents);
    }

    // Otherwise, return all students
    res.json(allStudents);
  } catch (err) {
    console.error("Error in GET /students:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /students → add a student to User collection
router.post("/students", async (req, res) => {
  try {
    const { usn, name, section, program, schoolYear, semester } = req.body;
    if (!usn || !name || !schoolYear || !semester) {
      return res.status(400).json({ message: "usn, name, schoolYear, semester required" });
    }

    const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
    const normalizedSemester = normalizeSemester(semester);

    // Check if student with this USN already exists
    let existing = await User.findOne({ usn, role: 'student', deletedAt: null });
    let student;

    if (existing) {
      // Student exists, check if they're already in this schoolyear+semester
      const schoolYearEntry = existing.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
      if (schoolYearEntry) {
        const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
        if (semesterEntry) {
          // Already enrolled in this exact schoolyear+semester
          return res.status(409).json({ message: `Student already enrolled in ${normalizedSchoolYear} ${normalizedSemester} semester` });
        }
        // Add new semester to existing schoolyear
        schoolYearEntry.semesters.push(createSemesterEntry(normalizedSemester));
      } else {
        // Add new schoolyear with this semester
        existing.schoolYears.push(createSchoolYearEntry(normalizedSchoolYear, normalizedSemester));
      }
      // Update basic fields if provided
      if (section) existing.section = section;
      if (program) existing.program = program;
      existing.markModified('schoolYears');
      student = existing;
    } else {
      // Create new student in User collection
      student = new User({
        role: "student",
        usn,
        name,
        section,
        program,
        schoolYears: [createSchoolYearEntry(normalizedSchoolYear, normalizedSemester)]
      });
    }

    await student.save();

    logActivity({
      userId: student._id,
      username: student.name,
      role: "student",
      action: "create_student",
      category: "students",
      details: `Created student ${student.name} (${student.usn})`,
      metadata: { schoolYear: normalizedSchoolYear, semester: normalizedSemester },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(201).json(student);
  } catch (err) {
    console.error("Error in POST /students:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /payment-items → list saved payment items, optionally filter by schoolYear/semester
router.get("/payment-items", async (req, res) => {
  try {
    const filter = {};
    if (req.query.schoolYear) {
      filter.schoolYear = normalizeSchoolYear(req.query.schoolYear);
    }
    if (req.query.semester) {
      filter.semester = normalizeSemester(req.query.semester);
    }
    const items = await PaymentItem.find(filter).sort({ createdAt: 1 });
    return res.json(items);
  } catch (err) {
    console.error("Error in GET /payment-items:", err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /payment-items → add a new payment item to the collection and all students in that school year/semester
router.post("/payment-items", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { name, amount, schoolYear, semester, releaseEnabled } = req.body;
    if (!name || !amount || !schoolYear || !semester) {
      return res.status(400).json({ message: "name, amount, schoolYear, and semester are required" });
    }

    const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
    const normalizedSemester = normalizeSemester(semester);
    const typeKey = String(name).trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    if (!typeKey) {
      return res.status(400).json({ message: "Please enter a valid payment item name" });
    }

    const formattedAmount = `₱${Number(String(amount).replace(/[^\d.]/g, "") || 0).toLocaleString()}`;

    const existingItem = await PaymentItem.findOne({
      type: typeKey,
      schoolYear: normalizedSchoolYear,
      semester: normalizedSemester
    });

    if (existingItem) {
      return res.status(409).json({ message: "A payment item with the same name already exists for this school year and semester" });
    }

    const paymentItem = await PaymentItem.create({
      type: typeKey,
      name: name.trim(),
      amount: formattedAmount,
      status: "active",
      schoolYear: normalizedSchoolYear,
      semester: normalizedSemester,
      releaseEnabled: Boolean(releaseEnabled),
      released: false
    });

    const students = await User.find({
      role: "student",
      deletedAt: null,
      "schoolYears.schoolYear": normalizedSchoolYear,
      "schoolYears.semesters.semester": normalizedSemester
    });

    let updatedCount = 0;
    for (const student of students) {
      const schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
      if (!schoolYearEntry) continue;
      const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
      if (!semesterEntry) continue;

      if (!semesterEntry.payments) {
        semesterEntry.payments = {};
      }

      if (!Object.prototype.hasOwnProperty.call(semesterEntry.payments, typeKey)) {
        semesterEntry.payments[typeKey] = {
          amount: formattedAmount,
          status: "unpaid",
          datePaid: null,
          released: false
        };
        student.markModified("schoolYears");
        await student.save();
        updatedCount += 1;
      }
    }

    logActivity({
      userId: req.user._id,
      username: req.user.username || req.user.name || "Admin",
      role: req.user.role,
      action: "create_payment_item",
      category: "payments",
      details: `Added payment item ${name} for ${normalizedSchoolYear} ${normalizedSemester}`,
      metadata: { type: typeKey, name: name.trim(), schoolYear: normalizedSchoolYear, semester: normalizedSemester, updatedCount },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.status(201).json({
      message: `Added payment item to ${updatedCount} students`,
      item: paymentItem
    });
  } catch (err) {
    console.error("Error in POST /payment-items:", err);
    return res.status(500).json({ message: err.message });
  }
});

// PUT /students/:id → update student record
router.put("/students/:id", async (req, res) => {
  try {
    const { name, usn, section, program, competency, schoolYear, semester } = req.body;

    // Find student in User collection
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update basic fields
    if (name) student.name = name;
    if (usn) student.usn = usn;
    if (section) student.section = section;
    if (program) student.program = program;
    if (typeof competency !== 'undefined') {
      student.competency = competency;
    }

    // If updating enrollment for specific school year/semester, add to schoolYears if not exists
    if (schoolYear && semester) {
      const targetYear = normalizeSchoolYear(schoolYear);
      const targetSem = normalizeSemester(semester);

      let schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === targetYear);
      if (!schoolYearEntry) {
        schoolYearEntry = {
          schoolYear: targetYear,
          semesters: []
        };
        student.schoolYears.push(schoolYearEntry);
      }

      let semesterEntry = schoolYearEntry.semesters.find(s => s.semester === targetSem);
      if (!semesterEntry) {
        semesterEntry = createSemesterEntry(targetSem);
        schoolYearEntry.semesters.push(semesterEntry);
      }

      student.markModified('schoolYears');
    }

    await student.save();

    logActivity({
      userId: student._id,
      username: student.name,
      role: "student",
      action: "update_student",
      category: "students",
      details: `Updated student record for ${student.name} (${student.usn})`,
      metadata: { schoolYear: schoolYear || "", semester: semester || "" },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.json({ message: "Student updated", student });
  } catch (err) {
    console.error("Error in PUT /students/:id:", err);
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /students/:id → soft delete student from User collection
router.delete("/students/:id", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student', deletedAt: null });
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.deletedAt = new Date();
    await student.save();

    logActivity({
      userId: student._id,
      username: student.name,
      role: "student",
      action: "delete_student",
      category: "students",
      details: `Deleted student ${student.name} (${student.usn})`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    return res.json({ message: "Student moved to trash" });
  } catch (err) {
    console.error("Error in DELETE /students/:id:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /students/search?q=... → search students by name/program/section
router.get("/students/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");

    // Search in User collection for students
    const students = await User.find({
      role: 'student',
      deletedAt: null,
      $or: [
        { name: regex },
        { program: regex },
        { section: regex },
        { usn: regex }
      ]
    });

    res.json(students);
  } catch (err) {
    console.error("Error in GET /students/search:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /school-years → get all unique normalized school years from SchoolYear model
router.get("/school-years", async (req, res) => {
  try {
    const schoolYears = await SchoolYear.distinct("year");
    const normalizedSchoolYears = [...new Set(schoolYears.map((year) => normalizeSchoolYear(year)).filter(Boolean))].sort();
    res.json(normalizedSchoolYears);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /school-years → add a new school year with both semesters and explicit collections
router.post("/school-years", async (req, res) => {
  const { year } = req.body;
  const normalizedYear = normalizeSchoolYear(year);
  if (!normalizedYear) return res.status(400).json({ message: "Year required" });

  try {
    const existingYears = await SchoolYear.distinct("year");
    const existing = existingYears.some((value) => normalizeSchoolYear(value) === normalizedYear);
    if (existing) return res.status(400).json({ message: "School year already exists" });

    await SchoolYear.create({ year: normalizedYear, semester: "1st" });
    await SchoolYear.create({ year: normalizedYear, semester: "2nd" });

    // also create an explicit student collection for each semester
    const makeCollection = async (name) => {
      const db = require('mongoose').connection.db;
      const collections = await db.listCollections({ name }).toArray();
      if (collections.length === 0) {
        await db.createCollection(name);
      }
    };

    const c1 = `1st_${normalizedYear}`;
    const c2 = `2nd_${normalizedYear}`;

    await makeCollection(c1);
    await makeCollection(c2);

    return res.status(201).json({ message: "School year added with both semester collections", collections: [c1, c2] });
  } catch (err) {
    console.error("Error creating school year:", err);
    return res.status(500).json({ message: err.message });
  }
});

// PUT /school-years/:year → update a school year name
router.put("/school-years/:oldYear", async (req, res) => {
  const { oldYear } = req.params;
  const { year: newYear } = req.body;
  const normalizedOldYear = normalizeSchoolYear(oldYear);
  const normalizedNewYear = normalizeSchoolYear(newYear);
  if (!normalizedNewYear) return res.status(400).json({ message: "New year required" });

  try {
    const existingYears = await SchoolYear.distinct("year");
    const existing = existingYears.some(
      (value) => normalizeSchoolYear(value) === normalizedNewYear && normalizeSchoolYear(value) !== normalizedOldYear
    );
    if (existing) return res.status(400).json({ message: "School year already exists" });

    // Update all SchoolYear documents with the old year to the new year
    await SchoolYear.updateMany(
      { year: { $in: [oldYear, normalizedOldYear, `SY ${normalizedOldYear}`] } },
      { year: normalizedNewYear }
    );

    // Rename collections if they exist
    const db = require('mongoose').connection.db;
    const oldC1 = `1st_${normalizedOldYear}`;
    const oldC2 = `2nd_${normalizedOldYear}`;
    const newC1 = `1st_${normalizedNewYear}`;
    const newC2 = `2nd_${normalizedNewYear}`;

    const renameCollection = async (oldName, newName) => {
      try {
        const collections = await db.listCollections({ name: oldName }).toArray();
        if (collections.length > 0) {
          await db.collection(oldName).rename(newName);
        }
      } catch (err) {
        console.error(`Error renaming collection ${oldName} to ${newName}:`, err);
      }
    };

    await renameCollection(oldC1, newC1);
    await renameCollection(oldC2, newC2);

    return res.json({ message: "School year updated successfully" });
  } catch (err) {
    console.error("Error updating school year:", err);
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /school-years/:year → delete a school year and its collections
router.delete("/school-years/:year", async (req, res) => {
  const { year } = req.params;
  const normalizedYear = normalizeSchoolYear(year);

  try {
    // Delete all SchoolYear documents for this year
    await SchoolYear.deleteMany({ year: { $in: [year, normalizedYear, `SY ${normalizedYear}`] } });

    // Drop the collections if they exist
    const db = require('mongoose').connection.db;
    const c1 = `1st_${normalizedYear}`;
    const c2 = `2nd_${normalizedYear}`;

    const dropCollection = async (name) => {
      try {
        const collections = await db.listCollections({ name }).toArray();
        if (collections.length > 0) {
          await db.dropCollection(name);
        }
      } catch (err) {
        console.error(`Error dropping collection ${name}:`, err);
      }
    };

    await dropCollection(c1);
    await dropCollection(c2);

    return res.json({ message: "School year deleted successfully" });
  } catch (err) {
    console.error("Error deleting school year:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /program/:program/sections → list sections for a program
router.get("/program/:program/sections", async (req, res) => {
  try {
    const programName = req.params.program;
    const { schoolYear, semester } = req.query;
    const hasScopedLookup = Boolean(schoolYear && semester);

    let program = null;
    if (hasScopedLookup) {
      program = await Program.findOne({ ...buildProgramFilter(programName, schoolYear, semester), deletedAt: null });
    } else {
      const matches = await Program.find({ name: String(programName || "").trim(), deletedAt: null }).sort({ createdAt: -1 });
      if (matches.length > 1) {
        return res.status(400).json({ message: "schoolYear and semester are required for this program" });
      }
      program = matches[0] || null;
    }

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const sections = getProgramSections(program);
    res.json(sections.map((section) => ({ _id: section, name: section })));
  } catch (err) {
    console.error("Error fetching program sections:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /program/:program/sections → add a new section for a program
router.post("/program/:program/sections", async (req, res) => {
  try {
    const programName = req.params.program;
    const { name, schoolYear, semester } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Section name is required" });
    }

    const hasScopedLookup = Boolean(schoolYear && semester);
    let program = null;

    if (hasScopedLookup) {
      program = await Program.findOne({ ...buildProgramFilter(programName, schoolYear, semester), deletedAt: null });
    } else {
      const matches = await Program.find({ name: String(programName || "").trim(), deletedAt: null }).sort({ createdAt: -1 });
      if (matches.length > 1) {
        return res.status(400).json({ message: "schoolYear and semester are required when adding a section to this program" });
      }
      program = matches[0] || null;
    }

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const sectionName = name.trim();
    const sections = getProgramSections(program);
    if (sections.includes(sectionName)) {
      return res.status(409).json({ message: "Section already exists" });
    }

    program.sections = [...sections, sectionName];
    program.updatedAt = Date.now();
    await program.save();

    res.status(201).json({ _id: sectionName, name: sectionName, program: program.name, schoolYear: program.schoolYear, semester: program.semester });
  } catch (err) {
    console.error("Error adding section to program:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /users → list users by role or all
router.get("/users", async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    filter.deletedAt = null;
    filter.deletedAt = null;
    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /activity-log → list activity logs (optional filter by userId or username)
router.get("/activity-log", authMiddleware, async (req, res) => {
  try {
    const filter = {};
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      filter.userId = req.user.id;
      filter.action = { $not: /login/i };
    } else {
      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      if (req.query.username) {
        filter.username = new RegExp(escapeRegExp(req.query.username), "i");
      }
    }

    const logs = await ActivityLog.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /student/:id → get student details with dynamically loaded payment items
router.get("/student/:id", async (req, res) => {
  try {
    // Find student in User collection
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found" });
    }

    // For each schoolYear/semester the student has, load payment items from collection
    if (student.schoolYears && Array.isArray(student.schoolYears)) {
      for (const schoolYearEntry of student.schoolYears) {
        if (!schoolYearEntry.semesters || !Array.isArray(schoolYearEntry.semesters)) {
          continue;
        }

        for (const semesterEntry of schoolYearEntry.semesters) {
          // Fetch payment items from PaymentItem collection for this schoolYear/semester
          const paymentItems = await PaymentItem.find({
            schoolYear: schoolYearEntry.schoolYear,
            semester: semesterEntry.semester,
            status: "active"
          });

          // Initialize payments object if it doesn't exist
          if (!semesterEntry.payments) {
            semesterEntry.payments = {};
          }

          // For each payment item, ensure it exists in student's payments
          for (const paymentItem of paymentItems) {
            if (!semesterEntry.payments.hasOwnProperty(paymentItem.type)) {
              semesterEntry.payments[paymentItem.type] = {
                amount: paymentItem.amount,
                status: "unpaid",
                datePaid: null,
                released: false
              };
            }
          }

          // Remove payment entries that no longer have corresponding items in the collection
          const validTypes = new Set(paymentItems.map(item => item.type));
          for (const paymentType in semesterEntry.payments) {
            if (!validTypes.has(paymentType)) {
              delete semesterEntry.payments[paymentType];
            }
          }
        }
      }
      student.markModified('schoolYears');
    }

    res.json(student);
  } catch (err) {
    console.error("Error in GET /student/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /user/:id -> get user details including profile image
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /user/:id/profile -> upload profile image
router.post("/user/:id/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.files || !req.files.profile) {
      return res.status(400).json({ message: "Profile image file is required" });
    }

    const profileFile = req.files.profile;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(profileFile.mimetype)) {
      return res.status(400).json({ message: "Only JPG, PNG, or WEBP images are allowed" });
    }

    const extension = path.extname(profileFile.name).toLowerCase();
    const fileName = `profile_${user._id}_${Date.now()}${extension}`;
    const uploadPath = path.join(__dirname, "../../uploads", fileName);

    await profileFile.mv(uploadPath);

    user.profile = fileName;
    await user.save();

    logActivity({
      userId: user._id,
      username: user.username || user.name || "unknown",
      role: user.role,
      action: "upload_profile_photo",
      category: "users",
      details: `Uploaded profile photo for ${user.username || user.name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ message: "Profile image uploaded successfully", profile: fileName });
  } catch (err) {
    console.error("Error uploading profile image:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /user/:id -> update user fields (name, usn, password, section, program)
router.put("/user/:id", async (req, res) => {
  try {
    const { name, usn, password, currentPassword, section, program } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name && typeof name === "string") user.name = name;
    if (usn && typeof usn === "string") user.usn = usn;
    if (password && typeof password === "string") {
      // If password is being changed, verify current password for staff/admin
      if (user.role && ["staff", "admin", "assessment-coordinator"].includes(user.role)) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }
    if (section && typeof section === "string") user.section = section;
    if (program && typeof program === "string") user.program = program;

    await user.save();

    logActivity({
      userId: user._id,
      username: user.username || user.name || "unknown",
      role: user.role,
      action: "update_user",
      category: "users",
      details: `Updated user ${user.username || user.name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /user/:id -> soft delete user
router.delete("/user/:id", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.deletedAt = new Date();
    await user.save();

    logActivity({
      userId: user._id,
      username: user.username || user.name || "unknown",
      role: user.role,
      action: "delete_user",
      category: "users",
      details: `Deleted user ${user.username || user.name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ message: "User moved to trash" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /student/:id/payment → update payment status
router.put("/student/:id/payment", authMiddleware, async (req, res) => {
  try {
    const { paymentType, status, datePaid, semester, schoolYear } = req.body;

    // Validate required fields
    if (!paymentType || !status || !semester || !schoolYear) {
      return res.status(400).json({ message: "paymentType, status, semester, and schoolYear are required" });
    }

    const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
    const normalizedSemester = normalizeSemester(semester);

    // Find student in User collection
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find or create schoolYear entry
    let schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
    if (!schoolYearEntry) {
      schoolYearEntry = {
        schoolYear: normalizedSchoolYear,
        semesters: []
      };
      student.schoolYears.push(schoolYearEntry);
    }

    // Find or create semester entry
    let semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
    if (!semesterEntry) {
      semesterEntry = createSemesterEntry(normalizedSemester);
      schoolYearEntry.semesters.push(semesterEntry);
    }

    // Validate payment type
    const validPaymentTypes = ['module', 'tshirt', 'tenk', 'fortyFiveHundred'];
    if (!validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ message: `Invalid payment type: ${paymentType}` });
    }

    // Update the payment
    semesterEntry.payments[paymentType].status = status;
    semesterEntry.payments[paymentType].datePaid = status === "paid" ? (datePaid || new Date()) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, 'released')) {
      semesterEntry.payments[paymentType].released = req.body.released;
    }

    // Mark as modified for Mongoose
    student.markModified('schoolYears');

    await student.save();

    logActivity({
      userId: req.user?.id || student._id,
      username: req.user?.username || req.user?.name || student.name,
      role: req.user?.role || "student",
      action: "update_payment",
      category: "payments",
      details: `Payment ${paymentType} set to ${status} for ${student.name}`,
      metadata: {
        paymentType,
        status,
        schoolYear: normalizedSchoolYear,
        semester: normalizedSemester,
        targetStudentId: student._id.toString(),
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ message: "Payment updated successfully", student });
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /student/:id/payment-receipt → upload payment proof to transactions collection
router.post("/student/:id/payment-receipt", async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { paymentType, schoolYear, semester } = req.body;

    if (!paymentType || !schoolYear || !semester) {
      return res.status(400).json({ message: "paymentType, schoolYear and semester are required" });
    }
    const validTypes = ['module', 'tshirt', 'tenk', 'fortyFiveHundred'];
    if (!validTypes.includes(paymentType)) {
      return res.status(400).json({ message: "Invalid paymentType" });
    }

    if (!req.files || !req.files.receipt) {
      return res.status(400).json({ message: "Receipt image is required" });
    }

    const receipt = req.files.receipt;
    const timestamp = Date.now();
    const fileExt = receipt.name.split('.').pop();
    const fileName = `receipt-${student._id}-${paymentType}-${timestamp}.${fileExt}`;
    const uploadDir = "uploads";
    const uploadPath = `${uploadDir}/${fileName}`;

    await receipt.mv(uploadPath);

    const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
    const normalizedSemester = normalizeSemester(semester);
    const paymentAmount = defaultPaymentFields[paymentType]?.amount || "₱0";

    // Check if there's already a pending transaction for this payment type
    const existingTransaction = await Transaction.findOne({
      studentId: student._id,
      paymentType,
      schoolYear: normalizedSchoolYear,
      semester: normalizedSemester,
      status: "pending"
    });

    let transaction;
    if (existingTransaction) {
      // Update existing transaction with new receipt
      existingTransaction.receiptImage = fileName;
      existingTransaction.createdAt = new Date(); // Update timestamp
      await existingTransaction.save();
      transaction = existingTransaction;
    } else {
      // Create new transaction record
      transaction = new Transaction({
        studentId: student._id,
        studentName: student.name,
        studentUsn: student.usn,
        paymentType,
        schoolYear: normalizedSchoolYear,
        semester: normalizedSemester,
        receiptImage: fileName,
        amount: paymentAmount,
        status: "pending"
      });
      await transaction.save();
    }

    logActivity({
      userId: student._id,
      username: student.name,
      role: "student",
      action: "payment_receipt_upload",
      category: "payments",
      details: `Student uploaded payment receipt for ${paymentType} (${normalizedSchoolYear} ${normalizedSemester}) - awaiting admin confirmation`,
      metadata: { paymentType, schoolYear: normalizedSchoolYear, semester: normalizedSemester, receipt: fileName, transactionId: transaction._id },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    // Notify all admins and staff about the new pending transaction
    try {
      const adminsAndStaff = await User.find({ role: { $in: ["admin", "staff"] }, deletedAt: null });
      const notifications = adminsAndStaff.map(user => ({
        userId: user._id,
        message: `New payment receipt uploaded by ${student.name} (${student.usn}) for ${paymentType} (${normalizedSchoolYear} ${normalizedSemester}) - awaiting approval.`,
        type: "info"
      }));
      await Notification.insertMany(notifications);
    } catch (notificationError) {
      console.error("Failed to create pending transaction notifications:", notificationError);
      // Don't fail the upload if notifications fail
    }

    res.json({ message: "Receipt uploaded successfully. Awaiting admin confirmation.", transaction });
  } catch (err) {
    console.error("Error uploading payment receipt:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements → create an announcement (staff/admin)
router.post("/announcements", authMiddleware, async (req, res) => {
  try {
    const { title, content, author, role, status } = req.body;
    
    if (!title || !content || !author || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const announcementData = {
      title,
      content,
      author,
      authorId: req.user?.id || null,
      role,
    };

    // If an image file was uploaded via multipart/form-data (express-fileupload), save it
    if (req.files && req.files.image) {
      try {
        const imageFile = req.files.image;
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(imageFile.mimetype)) {
          return res.status(400).json({ message: "Only JPG, PNG, or WEBP images are allowed for announcements" });
        }

        const extension = path.extname(imageFile.name).toLowerCase();
        const fileName = `announcement_${Date.now()}${extension}`;
        const uploadPath = path.join(__dirname, "../../uploads", fileName);

        await imageFile.mv(uploadPath);
        announcementData.image = fileName;
        announcementData.photo = fileName;
      } catch (fileErr) {
        console.error("Failed to save announcement image:", fileErr);
        return res.status(500).json({ message: "Failed to save announcement image" });
      }
    }

    if (status === "draft") {
      announcementData.status = "draft";
    } else if (role === "admin") {
      announcementData.status = "approved";
      announcementData.approvedBy = author;
      announcementData.approvalDate = new Date();
    } else {
      announcementData.status = "pending";
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    logActivity({
      userId: req.user?.id || null,
      username: author || "Unknown",
      role: req.user?.role || role || "staff",
      action: "create_announcement",
      category: "announcements",
      details: `Created announcement: ${title}`,
      metadata: { status: announcement.status, role: announcement.role },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /announcements/pending → get pending announcements (admin only)
router.get("/announcements/pending", async (req, res) => {
  try {
    const pending = await Announcement.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /announcements → get all approved announcements (all users)
router.get("/announcements", async (req, res) => {
  try {
    // For authenticated users, include their drafts
    const token = req.headers.authorization?.split(" ")[1];
    let user = null;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // Invalid token, treat as unauthenticated
      }
    }

    let query;
    if (req.query.archived === "true") {
      query = {
        archived: true,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      };
    } else if (req.query.deleted === "true") {
      query = { deletedAt: { $ne: null } };
    } else {
      query = {
        $and: [
          { $or: [{ archived: false }, { archived: { $exists: false } }] },
          { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }
        ]
      };

      if (req.query.status) {
        const requestedStatus = req.query.status;
        if (requestedStatus === "draft") {
          if (user) {
            query.$and.push({ status: "draft", author: user.username });
          } else {
            query.$and.push({ status: "approved" });
          }
        } else if (["approved", "pending", "rejected"].includes(requestedStatus)) {
          query.$and.push({ status: requestedStatus });
        } else {
          query.$and.push({ status: "approved" });
        }
      } else if (user) {
        if (user.role === "admin") {
          query.$and.push({ $or: [{ status: "approved" }, { status: "draft" }] });
        } else {
          query.$and.push({
            $or: [
              { status: "approved" },
              { status: "draft", author: user.username }
            ]
          });
        }
      } else {
        query.$and.push({ status: "approved" });
      }
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/react → toggle like for current user
router.put("/announcements/:id/react", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const username = user.username || user.name || "Unknown";
    const existingIndex = announcement.likes.findIndex((like) => String(like.userId) === String(userId));
    if (existingIndex >= 0) {
      announcement.likes.splice(existingIndex, 1);
    } else {
      announcement.likes.push({ userId, username });
    }
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error toggling announcement like:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements/:id/comments → add a comment to an announcement
router.post("/announcements/:id/comments", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const userId = req.user?.id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const username = user.username || user.name || "Unknown";
    const comment = { userId, username, text: String(text).trim() };

    announcement.comments.unshift(comment);
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error creating announcement comment:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements/:id/comments/:commentId/replies → reply to a comment
router.post("/announcements/:id/comments/:commentId/replies", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user?.id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid announcement or comment id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = { userId, username: user.username || user.name || "Unknown", text: String(text).trim() };
    comment.replies.unshift(reply);
    await announcement.save();

    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error creating announcement reply:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/comments/:commentId → edit a comment
router.put("/announcements/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user?.id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid announcement or comment id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (String(comment.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only edit your own comments" });
    }

    comment.text = String(text).trim();
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error editing announcement comment:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id/comments/:commentId → delete a comment and its replies
router.delete("/announcements/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (String(comment.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }

    announcement.comments.pull(commentId);
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error deleting announcement comment:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/comments/:commentId/replies/:replyId → edit a reply
router.put("/announcements/:id/comments/:commentId/replies/:replyId", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const commentId = req.params.commentId;
    const replyId = req.params.replyId;
    const userId = req.user?.id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(announcementId) || !mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ message: "Invalid announcement, comment, or reply id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (String(reply.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only edit your own replies" });
    }

    reply.text = String(text).trim();
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error editing announcement reply:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id/comments/:commentId/replies/:replyId → delete a reply
router.delete("/announcements/:id/comments/:commentId/replies/:replyId", authMiddleware, async (req, res) => {
  try {
    const announcementId = req.params.id;
    const commentId = req.params.commentId;
    const replyId = req.params.replyId;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.status !== "approved") {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (String(reply.userId) !== String(userId)) {
      return res.status(403).json({ message: "You can only delete your own replies" });
    }

    comment.replies.pull(replyId);
    await announcement.save();
    res.json({ announcementId: announcement._id, likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    console.error("Error deleting announcement reply:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id → edit an announcement (author or admin)
router.put("/announcements/:id", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (announcement.author !== user.username && user.role !== 'admin') {
      return res.status(403).json({ message: "You can only edit your own announcements" });
    }

    announcement.title = title.trim();
    announcement.content = content.trim();
    await announcement.save();
    res.json(announcement);
  } catch (err) {
    console.error("Error editing announcement:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/archive → archive an announcement
router.put("/announcements/:id/archive", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (announcement.author !== user.username && user.role !== 'admin') {
      return res.status(403).json({ message: "You can only archive your own announcements" });
    }

    announcement.archived = true;
    announcement.deletedAt = null;
    await announcement.save();
    res.json(announcement);
  } catch (err) {
    console.error("Error archiving announcement:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id → delete an announcement (author or admin)
router.delete("/announcements/:id", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (announcement.author !== user.username && user.role !== 'admin') {
      return res.status(403).json({ message: "You can only delete your own announcements" });
    }

    announcement.deletedAt = new Date();
    await announcement.save();
    res.json({ message: "Announcement moved to trash" });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/publish → publish a draft announcement (author or admin)
router.put("/announcements/:id/publish", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (announcement.status !== "draft") {
      return res.status(400).json({ message: "Only draft announcements can be published" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (announcement.author !== user.username && user.role !== 'admin') {
      return res.status(403).json({ message: "You can only publish your own drafts" });
    }

    if (user.role === 'admin') {
      announcement.status = "approved";
      announcement.approvedBy = user.username;
      announcement.approvalDate = new Date();
    } else {
      announcement.status = "pending";
    }

    await announcement.save();
    res.json(announcement);
  } catch (err) {
    console.error("Error publishing announcement:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /notifications → create notification for a user
router.post("/notifications", async (req, res) => {
  try {
    const { userId, message, type } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ message: "userId and message are required" });
    }
    const notification = new Notification({ userId, message, type: type || "info" });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error("Error creating notification", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /notifications → get notifications for all users or for specific user
router.get("/notifications", async (req, res) => {
  try {
    await archiveOldNotifications();
    const { userId, archived, deleted } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;

    if (archived === "true") {
      filter.archived = true;
      filter.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
    } else if (archived === "false") {
      filter.archived = false;
    }

    if (deleted === "true") {
      filter.deletedAt = { $ne: null };
    } else if (deleted === "false") {
      filter.deletedAt = null;
    }

    if (archived === undefined && deleted === undefined) {
      filter.$and = [
        { $or: [{ archived: false }, { archived: { $exists: false } }] },
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }
      ];
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /notifications/:id/read → mark notification as read
router.put("/notifications/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { status: "read" }, { new: true });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch (err) {
    console.error("Error updating notification", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /notifications/:id/archive → archive a notification
router.put("/notifications/:id/archive", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    // create archive record
    try {
      await ArchiveItem.create({
        originalCollection: "Notification",
        originalId: notification._id,
        data: notification.toObject(),
        archivedBy: req.user && (req.user.username || req.user.id) || null,
        archivedAt: new Date()
      });
    } catch (err) {
      console.error("Failed to create archive item:", err);
    }

    notification.archived = true;
    notification.deletedAt = null;
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error("Error archiving notification", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /notifications/:id → soft delete a notification
router.delete("/notifications/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    // persist a copy to Trash collection
    try {
      await TrashItem.create({
        originalCollection: "Notification",
        originalId: notification._id,
        data: notification.toObject(),
        deletedBy: req.user && (req.user.username || req.user.id) || null,
        deletedAt: new Date()
      });
    } catch (err) {
      console.error("Failed to create trash item:", err);
    }

    notification.deletedAt = new Date();
    await notification.save();
    res.json({ message: "Notification moved to trash" });
  } catch (err) {
    console.error("Error deleting notification", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /notifications/:id/restore → restore a soft-deleted notification
router.put("/notifications/:id/restore", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    notification.deletedAt = null;
    await notification.save();

    // remove corresponding trash record if exists
    try {
      await TrashItem.deleteMany({ originalCollection: "Notification", originalId: notification._id });
    } catch (err) {
      console.error("Failed to remove trash item on restore:", err);
    }

    res.json(notification);
  } catch (err) {
    console.error("Error restoring notification", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /trash/announcements/:id → permanently remove a trashed announcement
router.delete("/trash/announcements/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can permanently delete trashed announcements" });
    }

    const announcement = await Announcement.findOne({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!announcement) {
      return res.status(404).json({ message: "Trashed announcement not found" });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Announcement permanently deleted" });
  } catch (err) {
    console.error("Error permanently deleting announcement", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /trash/notifications/:id → permanently remove a trashed notification
router.delete("/trash/notifications/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can permanently delete trashed notifications" });
    }

    const notification = await Notification.findOne({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!notification) {
      return res.status(404).json({ message: "Trashed notification not found" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification permanently deleted" });
  } catch (err) {
    console.error("Error permanently deleting notification", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /archive → retrieve archived system items
router.get("/archive", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    const isAdminOrStaff = req.user?.role === "admin" || req.user?.role === "staff";
    const isStudent = req.user?.role === "student";

    const announcementFilter = { archived: true, deletedAt: null };
    const notificationFilter = { archived: true, deletedAt: null };
    if (isStudent) {
      notificationFilter.userId = req.user.id;
    } else if (userId) {
      notificationFilter.userId = userId;
    }

    // also include archived items persisted in ArchiveItem collection
    const archiveQuery = { archivedAt: { $exists: true } };
    if (isStudent) {
      archiveQuery['data.userId'] = req.user.id;
    } else if (userId) {
      archiveQuery['data.userId'] = userId;
    }

    const [announcements, notifications, programs, users, gcashAccounts, transactions, archivedItems] = await Promise.all([
      Announcement.find(announcementFilter).sort({ updatedAt: -1 }),
      Notification.find(notificationFilter).sort({ createdAt: -1 }),
      isAdminOrStaff ? Program.find({ archived: true, deletedAt: null }).sort({ updatedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? User.find({ archived: true, deletedAt: null }).sort({ updatedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? GCashAccount.find({ archived: true, deletedAt: null }).sort({ updatedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? Transaction.find({ archived: true, deletedAt: null }).sort({ updatedAt: -1 }) : Promise.resolve([]),
      ArchiveItem.find(archiveQuery).sort({ archivedAt: -1 })
    ]);

    const mappedArchived = (archivedItems || []).map((a) => {
      const type = String(a.originalCollection || "").toLowerCase();
      return serializeSystemItem(a.data, type === 'gcashaccount' ? 'gcash-account' : type);
    });

    const items = [
      ...announcements.map((item) => serializeSystemItem(item, "announcement")),
      ...notifications.map((item) => serializeSystemItem(item, "notification")),
      ...programs.map((item) => serializeSystemItem(item, "program")),
      ...users.map((item) => serializeSystemItem(item, "user")),
      ...gcashAccounts.map((item) => serializeSystemItem(item, "gcash-account")),
      ...transactions.map((item) => serializeSystemItem(item, "transaction")),
      ...mappedArchived
    ].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    res.json({ items });
  } catch (err) {
    console.error("Error fetching archive", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /trash → retrieve soft-deleted system items from the last 30 days
router.get("/trash", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    const isAdminOrStaff = req.user?.role === "admin" || req.user?.role === "staff";
    const isStudent = req.user?.role === "student";
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // prefer persisted TrashItem entries but also include any original-model soft-deleted items
    const trashQuery = { deletedAt: { $gte: cutoff } };
    if (isStudent) {
      trashQuery['data.userId'] = req.user.id;
    } else if (userId) {
      trashQuery['data.userId'] = userId;
    }

    const [trashItems, announcements, notifications, programs, users, gcashAccounts, transactions] = await Promise.all([
      TrashItem.find(trashQuery).sort({ deletedAt: -1 }),
      Announcement.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }),
      Notification.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }),
      isAdminOrStaff ? Program.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? User.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? GCashAccount.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }) : Promise.resolve([]),
      isAdminOrStaff ? Transaction.find({ deletedAt: { $gte: cutoff } }).sort({ deletedAt: -1 }) : Promise.resolve([])
    ]);

    const mappedTrash = (trashItems || []).map((t) => {
      const type = String(t.originalCollection || "").toLowerCase();
      return serializeSystemItem(t.data, type === 'gcashaccount' ? 'gcash-account' : type);
    });

    const items = [
      ...mappedTrash,
      ...announcements.map((item) => serializeSystemItem(item, "announcement")),
      ...notifications.map((item) => serializeSystemItem(item, "notification")),
      ...programs.map((item) => serializeSystemItem(item, "program")),
      ...users.map((item) => serializeSystemItem(item, "user")),
      ...gcashAccounts.map((item) => serializeSystemItem(item, "gcash-account")),
      ...transactions.map((item) => serializeSystemItem(item, "transaction"))
    ].sort((a, b) => new Date(b.deletedAt || b.updatedAt || b.createdAt) - new Date(a.deletedAt || a.updatedAt || a.createdAt));

    res.json({ items });
  } catch (err) {
    console.error("Error fetching trash", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/approve → approve an announcement (admin only)
router.put("/announcements/:id/approve", async (req, res) => {
  try {
    const { approvedBy } = req.body;
    if (!approvedBy) {
      return res.status(400).json({ message: "approvedBy is required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    announcement.status = "approved";
    announcement.approvedBy = approvedBy;
    announcement.approvalDate = new Date();
    await announcement.save();

    // Notify the staff author that their announcement was approved
    try {
      if (announcement.authorId) {
        await Notification.create({
          userId: announcement.authorId,
          message: `Your announcement "${announcement.title}" was approved by ${approvedBy}.`,
          type: "announcement",
          metadata: { announcementId: announcement._id, action: "approved", approvedBy }
        });
      } else {
        // Fallback: try to find author by username/name for older announcements
        const authorUser = await User.findOne({
          role: "staff",
          deletedAt: null,
          $or: [{ username: announcement.author }, { name: announcement.author }]
        });
        if (authorUser) {
          await Notification.create({
            userId: authorUser._id,
            message: `Your announcement "${announcement.title}" was approved by ${approvedBy}.`,
            type: "announcement",
            metadata: { announcementId: announcement._id, action: "approved", approvedBy }
          });
        }
      }
    } catch (authorNotificationError) {
      console.error("Failed to create author approval notification:", authorNotificationError);
    }

    // Notify all students about the new announcement
    try {
      const students = await User.find({ role: "student", deletedAt: null });
      const notifications = students.map(student => ({
        userId: student._id,
        message: `New announcement: ${announcement.title}`,
        type: "announcement",
        metadata: { announcementId: announcement._id }
      }));
      await Notification.insertMany(notifications);
    } catch (notificationError) {
      console.error("Failed to create announcement notifications:", notificationError);
      // Don't fail the approval if notifications fail
    }

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/reject → reject an announcement (admin only)
router.put("/announcements/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    announcement.status = "rejected";
    await announcement.save();

    try {
      if (announcement.authorId) {
        const message = reason
          ? `Your announcement "${announcement.title}" was rejected. Reason: ${reason}`
          : `Your announcement "${announcement.title}" was rejected.`;

        await Notification.create({
          userId: announcement.authorId,
          message,
          type: "announcement",
          metadata: { announcementId: announcement._id, action: "rejected", rejectedBy: req.user?.username || null, reason: reason || null }
        });
      } else {
        // Fallback: try to find author by username/name for older announcements
        const authorUser = await User.findOne({
          role: "staff",
          deletedAt: null,
          $or: [{ username: announcement.author }, { name: announcement.author }]
        });
        if (authorUser) {
          const message = reason
            ? `Your announcement "${announcement.title}" was rejected. Reason: ${reason}`
            : `Your announcement "${announcement.title}" was rejected.`;

          await Notification.create({
            userId: authorUser._id,
            message,
            type: "announcement",
            metadata: { announcementId: announcement._id, action: "rejected", rejectedBy: req.user?.username || null, reason: reason || null }
          });
        }
      }
    } catch (authorNotificationError) {
      console.error("Failed to create author rejection notification:", authorNotificationError);
    }

    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /announcements → get approved announcements and drafts for authenticated authors/admins
router.get("/announcements", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    let user = null;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // invalid token, ignore draft access
      }
    }

    let query = { status: "approved" };
    if (user) {
      if (user.role === "admin") {
        query = { $or: [{ status: "approved" }, { status: "draft" }] };
      } else {
        query = { $or: [{ status: "approved" }, { status: "draft", author: user.username }] };
      }
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/react → like/unlike an announcement
router.put("/announcements/:id/react", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const userId = req.user.id;
    const userIndex = announcement.likes.indexOf(userId);

    if (userIndex > -1) {
      // Unlike
      announcement.likes.splice(userIndex, 1);
    } else {
      // Like
      announcement.likes.push(userId);

      // Notify announcement owner if not the liker
      if (String(announcement.userId) !== String(userId)) {
        const liker = await User.findById(userId, "name");
        await Notification.create({
          userId: announcement.userId,
          message: `${liker.name} liked your announcement: "${announcement.title}"`,
          type: "engagement",
          metadata: { announcementId: announcement._id }
        });
      }
    }

    await announcement.save();
    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements/:id/comments → add a comment to an announcement
router.post("/announcements/:id/comments", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const userId = req.user.id;
    const commenter = await User.findById(userId, "name");
    const newComment = {
      userId,
      username: commenter.name,
      text: text.trim(),
      createdAt: new Date(),
      replies: []
    };

    announcement.comments.push(newComment);
    await announcement.save();

    // Notify announcement owner if not the commenter
    if (String(announcement.userId) !== String(userId)) {
      await Notification.create({
        userId: announcement.userId,
        message: `${commenter.name} commented on your announcement: "${announcement.title}"`,
        type: "engagement",
        metadata: { announcementId: announcement._id }
      });
    }

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /announcements/:id/comments/:commentId/replies → add a reply to a comment
router.post("/announcements/:id/comments/:commentId/replies", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userId = req.user.id;
    const replier = await User.findById(userId, "name");
    const newReply = {
      userId,
      username: replier.name,
      text: text.trim(),
      createdAt: new Date()
    };

    comment.replies.push(newReply);
    await announcement.save();

    // Notify comment owner if not the replier
    if (String(comment.userId) !== String(userId)) {
      await Notification.create({
        userId: comment.userId,
        message: `${replier.name} replied to your comment`,
        type: "engagement",
        metadata: { announcementId: announcement._id }
      });
    }

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/comments/:commentId → edit a comment
router.put("/announcements/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (String(comment.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own comments" });
    }

    comment.text = text.trim();
    await announcement.save();

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id/comments/:commentId → delete a comment
router.delete("/announcements/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (String(comment.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }

    announcement.comments.pull(req.params.commentId);
    await announcement.save();

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /announcements/:id/comments/:commentId/replies/:replyId → edit a reply
router.put("/announcements/:id/comments/:commentId/replies/:replyId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (String(reply.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own replies" });
    }

    reply.text = text.trim();
    await announcement.save();

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /announcements/:id/comments/:commentId/replies/:replyId → delete a reply
router.delete("/announcements/:id/comments/:commentId/replies/:replyId", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const comment = announcement.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (String(reply.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only delete your own replies" });
    }

    comment.replies.pull(req.params.replyId);
    await announcement.save();

    res.json({ likes: announcement.likes, comments: announcement.comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /bulk-import-students → bulk import students from CSV/Excel file
router.post("/bulk-import-students", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const schoolYear = req.body.schoolYear;
    const semester = req.body.semester;

    if (!schoolYear || !semester || !["1st", "2nd"].includes(semester)) {
      return res.status(400).json({ message: "schoolYear and semester are required (1st or 2nd)" });
    }

    const file = req.files.file;
    const fileContent = file.data.toString("utf8");

    // Parse CSV content and normalize headers for case-insensitive matching
    const records = csv.parse(fileContent, {
      columns: (header) => header.map((col) => String(col || "").trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    // Validate headers
    const requiredHeaders = ["name", "usn", "section", "program"];
    const firstRecord = records[0];
    const missingHeaders = requiredHeaders.filter(header => !(header in firstRecord));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        message: `Missing required columns: ${missingHeaders.join(", ")}. Required: name, usn, section, program` 
      });
    }

    const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
    const normalizedSemester = normalizeSemester(semester);

    // Process and validate records
    const results = { success: [], errors: [] };
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // row number in spreadsheet (accounting for header)

      // Trim all values
      const name = record.name?.trim();
      const usn = record.usn?.trim();
      const section = record.section?.trim();
      const program = record.program?.trim() || record.Program?.trim();

      // Validate required fields
      if (!name || !usn || !section || !program) {
        results.errors.push({
          row: rowNum,
          reason: "Missing required fields (name, usn, section, program)"
        });
        continue;
      }

      try {
let existing = await User.findOne({ usn, role: 'student', deletedAt: null });
        let student;

        if (existing) {
          // Student exists, check if already in this schoolyear+semester
          const schoolYearEntry = existing.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
          if (schoolYearEntry) {
            const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
            if (semesterEntry) {
              results.errors.push({
                row: rowNum,
                reason: `Student already enrolled in ${normalizedSchoolYear} ${normalizedSemester} semester`
              });
              continue;
            }
            // Add new semester to existing schoolyear
            schoolYearEntry.semesters.push(createSemesterEntry(normalizedSemester));
          } else {
            // Add new schoolyear with this semester
            existing.schoolYears.push(createSchoolYearEntry(normalizedSchoolYear, normalizedSemester));
          }
          existing.section = section;
          existing.program = program;
          existing.markModified('schoolYears');
          student = existing;
        } else {
          // Create new student
          student = new User({
            role: "student",
            name,
            usn,
            section,
            program,
            schoolYears: [createSchoolYearEntry(normalizedSchoolYear, normalizedSemester)],
          });
        }

        await student.save();
        results.success.push({ row: rowNum, usn, name });
      } catch (err) {
        results.errors.push({
          row: rowNum,
          reason: err.message || "Failed to create student"
        });
      }
    }

    res.json({
      message: `Import completed: ${results.success.length} success, ${results.errors.length} errors`,
      success: results.success,
      errors: results.errors
    });
  } catch (err) {
    console.error("Error in bulk import:", err);
    res.status(500).json({ message: "Error processing file: " + err.message });
  }
});

// POST /assessments/upload-csv → update multiple student competency records from CSV
router.post("/assessments/upload-csv", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const schoolYear = req.body.schoolYear;
    const semester = req.body.semester;
    const normalizedSchoolYear = schoolYear ? normalizeSchoolYear(schoolYear) : null;
    const normalizedSemester = semester ? normalizeSemester(semester) : null;

    const file = req.files.file;
    const fileContent = file.data.toString("utf8");

    const records = csv.parse(fileContent, {
      columns: (header) => header.map((col) => String(col || "").trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    const requiredHeaders = ["name", "section", "program", "competency"];
    const firstRecord = records[0];
    const missingHeaders = requiredHeaders.filter((header) => !(header in firstRecord));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `Missing required columns: ${missingHeaders.join(", ")}. Required: name, section, program, competency`,
      });
    }

    const results = { success: [], errors: [] };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2;
      const name = record.name?.trim();
      const usn = record.usn?.trim();
      const section = record.section?.trim();
      const program = record.program?.trim();
      const competency = normalizeCompetencyValue(record.competency);
      const dateValue = record.date?.trim();
      let competencyDate = null;

      if (!name || !section || !program || !competency) {
        results.errors.push({
          row: rowNum,
          reason: "Missing required values or invalid competency. Required columns: name, section, program, competency",
        });
        continue;
      }

      if (dateValue) {
        const parsedDate = new Date(dateValue);
        if (Number.isNaN(parsedDate.getTime())) {
          results.errors.push({ row: rowNum, reason: `Invalid date value: ${dateValue}` });
          continue;
        }
        competencyDate = parsedDate;
      }

      try {
        let student = null;

        if (usn) {
          student = await User.findOne({ usn, role: "student", deletedAt: null });
        }

        if (!student) {
          const searchQuery = {
            role: "student",
            deletedAt: null,
            name: new RegExp(`^${escapeRegExp(name)}$`, "i"),
            section: new RegExp(`^${escapeRegExp(section)}$`, "i"),
            program: new RegExp(`^${escapeRegExp(program)}$`, "i"),
          };

          const candidates = await User.find(searchQuery).limit(10);
          let filtered = candidates;
          if (filtered.length > 1 && (normalizedSchoolYear || normalizedSemester)) {
            filtered = filterStudentsBySchoolYearSemester(filtered, normalizedSchoolYear, normalizedSemester);
          }

          if (filtered.length === 1) {
            student = filtered[0];
          } else if (filtered.length === 0) {
            results.errors.push({
              row: rowNum,
              reason: usn
                ? `No student found matching USN ${usn}`
                : `No student found matching name, section, and program${normalizedSchoolYear ? ` for ${normalizedSchoolYear}` : ""}${normalizedSemester ? ` ${normalizedSemester}` : ""}`,
            });
            continue;
          } else {
            results.errors.push({
              row: rowNum,
              reason: `Multiple students matched. Please include USN or use a more specific student record.`,
            });
            continue;
          }
        }

        student.section = section;
        student.program = program;
        student.competency = competency;
        if (competencyDate) student.competencyDate = competencyDate;

        await student.save();
        results.success.push({ row: rowNum, name: student.name, usn: student.usn || null });
      } catch (err) {
        results.errors.push({ row: rowNum, reason: err.message || "Failed to update student competency" });
      }
    }

    return res.json({
      message: `Assessment import completed: ${results.success.length} success, ${results.errors.length} errors`,
      success: results.success,
      errors: results.errors,
    });
  } catch (err) {
    console.error("Error in assessment upload:", err);
    return res.status(500).json({ message: "Error processing assessment CSV: " + err.message });
  }
});

// POST /register → create a new user (admin only)
router.post("/register", async (req, res) => {
  try {
    const { role, username, password, name, usn, program, section, schoolYear, semester } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    let user;

    if (role === "student") {
      if (!name || !usn || !schoolYear || !semester) {
        return res.status(400).json({ message: "Name, USN, schoolYear and semester are required for students" });
      }

      const normalizedSchoolYear = normalizeSchoolYear(schoolYear);
      const normalizedSemester = normalizeSemester(semester);

      let existingStudent = await User.findOne({ usn, role: 'student', deletedAt: null });
      
      if (existingStudent) {
        // Student exists, check if already in this schoolyear+semester
        const schoolYearEntry = existingStudent.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
        if (schoolYearEntry) {
          const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
          if (semesterEntry) {
            return res.status(409).json({ message: `Student already enrolled in ${normalizedSchoolYear} ${normalizedSemester} semester` });
          }
          // Add new semester to existing schoolyear
          schoolYearEntry.semesters.push(createSemesterEntry(normalizedSemester));
        } else {
          // Add new schoolyear with this semester
          existingStudent.schoolYears.push(createSchoolYearEntry(normalizedSchoolYear, normalizedSemester));
        }
        if (section) existingStudent.section = section;
        if (program) existingStudent.program = program;
        existingStudent.markModified('schoolYears');
        user = existingStudent;
      } else {
        user = new User({
          role: "student",
          name,
          usn,
          program: program || "",
          section: section || "",
          schoolYears: [createSchoolYearEntry(normalizedSchoolYear, normalizedSemester)]
        });
      }
    } else if (role === "staff" || role === "admin" || role === "assessment-coordinator") {
      // Staff/Admin/Assessment Coordinator registration requires username and password
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required for staff/admin/assessment-coordinator" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ username, deletedAt: null });
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      user = new User({
        role,
        username,
        password: hashedPassword
      });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    await user.save();
    res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`, user });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /migrate-students → removed (legacy per-semester collections are no longer used)
// This endpoint is intentionally disabled.

// ===== PROGRAM ROUTES =====

// GET /programs → get all programs (filter by schoolYear and semester)
router.get("/programs", async (req, res) => {
  try {
    const { schoolYear, semester } = req.query;
    const filter = {};
    if (schoolYear) filter.schoolYear = normalizeSchoolYear(schoolYear);
    if (semester) filter.semester = normalizeSemester(semester);

    filter.deletedAt = null;
    const programs = await Program.find(filter).sort({ name: 1 });
    const hydratedPrograms = programs.map((program) => ({
      ...program.toObject(),
      sections: getProgramSections(program)
    }));

    res.json(hydratedPrograms);
  } catch (err) {
    console.error("Error fetching programs:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /programs → create a new program
router.post("/programs", async (req, res) => {
  try {
    const { name, schoolYear, semester, description } = req.body;
    if (!name || !schoolYear || !semester) {
      return res.status(400).json({ message: "name, schoolYear, semester required" });
    }

    const normalizedSemester = semester.toLowerCase().startsWith("2") ? "2nd" : "1st";

    const existing = await Program.findOne({ name, schoolYear, semester: normalizedSemester });
    if (existing) {
      return res.status(409).json({ message: "Program already exists for this year/semester" });
    }

    const program = new Program({
      name,
      schoolYear,
      semester: normalizedSemester,
      sections: [],
      description: description || ""
    });

    await program.save();
    res.status(201).json(program);
  } catch (err) {
    console.error("Error creating program:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /programs/:id/sections → get sections for a program
router.get("/programs/:id/sections", async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const sections = getProgramSections(program);
    res.json(sections.map((section) => ({ _id: section, name: section })));
  } catch (err) {
    console.error("Error fetching program sections:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /programs/:id/sections → add a section to a program
router.post("/programs/:id/sections", async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName || !sectionName.trim()) {
      return res.status(400).json({ message: "sectionName required" });
    }

    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const cleanedSectionName = sectionName.trim();
    const sections = getProgramSections(program);
    if (sections.includes(cleanedSectionName)) {
      return res.status(409).json({ message: "Section already exists in this program" });
    }

    program.sections = [...sections, cleanedSectionName];
    program.updatedAt = Date.now();
    await program.save();
    res.json(program);
  } catch (err) {
    console.error("Error adding section to program:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /programs/:id/sections/:sectionName → remove a section from a program
router.delete("/programs/:id/sections/:sectionName", async (req, res) => {
  try {
    const { sectionName } = req.params;
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    program.sections = getProgramSections(program).filter((s) => s !== sectionName);
    program.updatedAt = Date.now();
    await program.save();

    res.json(program);
  } catch (err) {
    console.error("Error removing section from program:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /programs/:id/sections/:oldSectionName → update a section name in a program
router.put("/programs/:id/sections/:oldSectionName", async (req, res) => {
  try {
    const { oldSectionName } = req.params;
    const { newSectionName } = req.body;

    if (!newSectionName || !newSectionName.trim()) {
      return res.status(400).json({ message: "New section name is required" });
    }

    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const sections = getProgramSections(program);
    if (!sections.includes(oldSectionName)) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (sections.includes(newSectionName.trim()) && newSectionName.trim() !== oldSectionName) {
      return res.status(400).json({ message: "Section name already exists" });
    }

    program.sections = sections.map(s => s === oldSectionName ? newSectionName.trim() : s);
    program.updatedAt = Date.now();
    await program.save();

    res.json(program);
  } catch (err) {
    console.error("Error updating section name:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /programs/:id → update a program
router.put("/programs/:id", async (req, res) => {
  try {
    const { name, description } = req.body;
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    if (name) program.name = name;
    if (description !== undefined) program.description = description;
    program.updatedAt = Date.now();

    await program.save();
    res.json(program);
  } catch (err) {
    console.error("Error updating program:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /programs/:id → soft delete a program
router.delete("/programs/:id", async (req, res) => {
  try {
    const program = await Program.findOne({ _id: req.params.id, deletedAt: null });
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    program.deletedAt = new Date();
    await program.save();

    res.json({ message: "Program moved to trash" });
  } catch (err) {
    console.error("Error deleting program:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /gcash-accounts → list all GCash accounts
router.get("/gcash-accounts", async (req, res) => {
  try {
    const accounts = await GCashAccount.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /gcash-accounts/active → get the active GCash account
router.get("/gcash-accounts/active", async (req, res) => {
  try {
    const account = await GCashAccount.findOne({ active: true, deletedAt: null });
    if (!account) {
      return res.status(404).json({ message: "No active GCash account found" });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /gcash-accounts → create a new GCash account (with file upload)
router.post("/gcash-accounts", async (req, res) => {
  try {
    const { name, number } = req.body;
    if (!name || !number) {
      return res.status(400).json({ message: "Name and number are required" });
    }

    let qrImage = null;
    let originalFileName = null;
    let qrImageData = null;
    let qrImageMimeType = null;
    if (req.files && req.files.qrImage) {
      const file = req.files.qrImage;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadPath = `uploads/${fileName}`;
      await file.mv(uploadPath);
      qrImage = fileName;  // Save only the file name, not the path
      originalFileName = file.name;
      qrImageData = file.data;
      qrImageMimeType = file.mimetype;
    }

    const account = new GCashAccount({ name, number, qrImage, qrImageData, qrImageMimeType, originalFileName });
    await account.save();

    logActivity({
      username: "Admin",
      role: "admin",
      action: "create_gcash_account",
      category: "payments",
      details: `Created GCash account for ${name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /gcash-accounts/:id → update a GCash account
router.put("/gcash-accounts/:id", async (req, res) => {
  try {
    const { name, number, active } = req.body;
    const account = await GCashAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: "GCash account not found" });
    }

    if (name) account.name = name;
    if (number) account.number = number;
    if (active !== undefined) {
      if (active) {
        // Deactivate others
        await GCashAccount.updateMany({ active: true }, { active: false });
      }
      account.active = active;
    }

    if (req.files && req.files.qrImage) {
      const file = req.files.qrImage;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadPath = `uploads/${fileName}`;
      await file.mv(uploadPath);
      account.qrImage = fileName;  // Save only the file name
      account.originalFileName = file.name;
      account.qrImageData = file.data;
      account.qrImageMimeType = file.mimetype;
    }

    account.updatedAt = Date.now();
    await account.save();

    logActivity({
      username: "Admin",
      role: "admin",
      action: "update_gcash_account",
      category: "payments",
      details: `Updated GCash account for ${account.name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /gcash-accounts/:id → soft delete a GCash account
router.delete("/gcash-accounts/:id", async (req, res) => {
  try {
    const account = await GCashAccount.findOne({ _id: req.params.id, deletedAt: null });
    if (!account) {
      return res.status(404).json({ message: "GCash account not found" });
    }

    account.deletedAt = new Date();
    await account.save();

    logActivity({
      username: "Admin",
      role: "admin",
      action: "delete_gcash_account",
      category: "payments",
      details: `Deleted GCash account for ${account.name}`,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.json({ message: "GCash account moved to trash" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== TRANSACTION ROUTES =====

// GET /transactions → get all transactions (admin/staff only, or student for own records)
router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { status, paymentType, schoolYear, semester, studentId } = req.query;
    const filter = {};

    if (req.user?.role === "student") {
      if (studentId && studentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      filter.studentId = req.user.id;
    } else if (req.user?.role === "admin" || req.user?.role === "staff") {
      if (studentId) filter.studentId = studentId;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    if (schoolYear) filter.schoolYear = normalizeSchoolYear(schoolYear);
    if (semester) filter.semester = normalizeSemester(semester);

    filter.deletedAt = null;
    const transactions = await Transaction.find(filter)
      .populate('studentId', 'name usn')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /transactions/:id/confirm → confirm a transaction (admin or staff only)
router.put("/transactions/:id/confirm", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { confirmedBy } = req.body;
    const actingUser = await User.findById(req.user.id);
    const username = confirmedBy || actingUser?.username || actingUser?.name || req.user.role || "Staff";

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ message: "Transaction is not pending" });
    }

    // Update transaction status
    transaction.status = "confirmed";
    transaction.confirmedBy = username;
    transaction.confirmationDate = new Date();
    await transaction.save();

    // Update student's payment status
    const student = await User.findById(transaction.studentId);
    if (student) {
      const normalizedSchoolYear = normalizeSchoolYear(transaction.schoolYear);
      const normalizedSemester = normalizeSemester(transaction.semester);

      let schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === normalizedSchoolYear);
      if (!schoolYearEntry) {
        schoolYearEntry = { schoolYear: normalizedSchoolYear, semesters: [] };
        student.schoolYears.push(schoolYearEntry);
      }

      let semesterEntry = schoolYearEntry.semesters.find(s => s.semester === normalizedSemester);
      if (!semesterEntry) {
        semesterEntry = createSemesterEntry(normalizedSemester);
        schoolYearEntry.semesters.push(semesterEntry);
      }

      semesterEntry.payments[transaction.paymentType] = {
        ...semesterEntry.payments[transaction.paymentType],
        status: "paid",
        datePaid: new Date(),
        receiptImage: transaction.receiptImage
      };

      student.markModified('schoolYears');
      await student.save();
    }

    logActivity({
      username,
      role: req.user.role,
      action: "confirm_transaction",
      category: "payments",
      details: `Confirmed payment transaction for ${transaction.studentName} (${transaction.paymentType})`,
      metadata: { transactionId: transaction._id, studentId: transaction.studentId, paymentType: transaction.paymentType },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    // Notify the student
    try {
      await Notification.create({
        userId: transaction.studentId,
        message: `Your ${transaction.paymentType} payment for ${transaction.schoolYear} ${transaction.semester} has been approved.`,
        type: "success"
      });
    } catch (notificationError) {
      console.error("Failed to create approval notification:", notificationError);
      // Don't fail the transaction if notification fails
    }

    res.json({ message: "Transaction confirmed successfully", transaction });
  } catch (err) {
    console.error("Error confirming transaction:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /transactions/:id/reject → reject a transaction (admin or staff only)
router.put("/transactions/:id/reject", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "staff") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { confirmedBy, rejectionReason } = req.body;
    const actingUser = await User.findById(req.user.id);
    const username = confirmedBy || actingUser?.username || actingUser?.name || req.user.role || "Staff";

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ message: "Transaction is not pending" });
    }

    // Update transaction status
    transaction.status = "rejected";
    transaction.confirmedBy = username;
    transaction.confirmationDate = new Date();
    transaction.rejectionReason = rejectionReason || `Payment rejected by ${username}`;
    await transaction.save();

    logActivity({
      username,
      role: req.user.role,
      action: "reject_transaction",
      category: "payments",
      details: `Rejected payment transaction for ${transaction.studentName} (${transaction.paymentType})`,
      metadata: { transactionId: transaction._id, studentId: transaction.studentId, paymentType: transaction.paymentType, rejectionReason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    // Notify the student
    try {
      await Notification.create({
        userId: transaction.studentId,
        message: `Your ${transaction.paymentType} payment for ${transaction.schoolYear} ${transaction.semester} has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
        type: "error"
      });
    } catch (notificationError) {
      console.error("Failed to create rejection notification:", notificationError);
      // Don't fail the transaction if notification fails
    }

    res.json({ message: "Transaction rejected successfully", transaction });
  } catch (err) {
    console.error("Error rejecting transaction:", err);
    res.status(500).json({ message: err.message });
  }
});

// Export router for use in server.js
module.exports = router;



