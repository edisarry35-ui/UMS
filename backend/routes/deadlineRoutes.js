const express = require("express");
const router = express.Router();
const PaymentDeadline = require("../models/PaymentDeadline");
const authMiddleware = require("../middleware/AuthMiddleware");
const { checkAndSendDeadlineNotifications } = require("../utils/deadlineNotifications");

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Get all payment deadlines
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const deadlines = await PaymentDeadline.find({ isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(deadlines);
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get deadline for specific school year and semester
router.get("/:schoolYear/:semester", authMiddleware, async (req, res) => {
  try {
    const { schoolYear, semester } = req.params;
    const deadline = await PaymentDeadline.findOne({
      schoolYear,
      semester,
      isActive: true
    }).populate("createdBy", "name");

    if (!deadline) {
      return res.status(404).json({ message: "No deadline set for this period" });
    }

    res.json(deadline);
  } catch (error) {
    console.error("Error fetching deadline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create or update payment deadline
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { schoolYear, semester, deadlineDate, notificationDays, description } = req.body;

    // Validate required fields
    if (!schoolYear || !semester || !deadlineDate) {
      return res.status(400).json({ message: "School year, semester, and deadline date are required" });
    }

    // Deactivate existing deadline for this period
    await PaymentDeadline.updateMany(
      { schoolYear, semester, isActive: true },
      { isActive: false }
    );

    // Create new deadline
    const deadline = new PaymentDeadline({
      schoolYear,
      semester,
      deadlineDate: new Date(deadlineDate),
      notificationDays: notificationDays || 7,
      description: description || "",
      createdBy: req.user.id
    });

    await deadline.save();
    await deadline.populate("createdBy", "name");
    await checkAndSendDeadlineNotifications();

    res.status(201).json({
      message: "Payment deadline set successfully",
      deadline
    });
  } catch (error) {
    console.error("Error creating deadline:", error);
    if (error.code === 11000) {
      res.status(400).json({ message: "An active deadline already exists for this period" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// Update deadline
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { deadlineDate, notificationDays, description } = req.body;

    const deadline = await PaymentDeadline.findByIdAndUpdate(
      req.params.id,
      {
        deadlineDate: deadlineDate ? new Date(deadlineDate) : undefined,
        notificationDays,
        description
      },
      { new: true }
    ).populate("createdBy", "name");

    if (!deadline) {
      return res.status(404).json({ message: "Deadline not found" });
    }

    await checkAndSendDeadlineNotifications();

    res.json({
      message: "Deadline updated successfully",
      deadline
    });
  } catch (error) {
    console.error("Error updating deadline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Manually trigger deadline notification check (admin only)
router.post("/check-notifications", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await checkAndSendDeadlineNotifications();
    res.json({ message: "Deadline notification check completed successfully" });
  } catch (error) {
    console.error("Error triggering deadline notifications:", error);
    res.status(500).json({ message: "Failed to check deadline notifications" });
  }
});

module.exports = router;