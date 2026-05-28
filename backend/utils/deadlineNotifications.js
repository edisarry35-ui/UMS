const PaymentDeadline = require("../models/PaymentDeadline");
const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Check for upcoming payment deadlines and send notifications to students
 * This function should be called periodically (e.g., daily via cron job)
 */
const checkAndSendDeadlineNotifications = async () => {
  try {
    console.log("Checking for upcoming payment deadlines...");

    // Get all active deadlines
    const deadlines = await PaymentDeadline.find({ isActive: true });

    for (const deadline of deadlines) {
      const now = new Date();
      const deadlineDate = new Date(deadline.deadlineDate);
      const notificationDate = new Date(deadlineDate);
      notificationDate.setDate(notificationDate.getDate() - deadline.notificationDays);

      // Check if we should send notifications (within notification window)
      if (now >= notificationDate && now < deadlineDate) {
        // Find students who haven't paid for this semester
        const students = await User.find({
          role: "student",
          "schoolYears.schoolYear": deadline.schoolYear,
          "schoolYears.semesters.semester": deadline.semester
        });

        let notificationCount = 0;

        for (const student of students) {
          const schoolYear = student.schoolYears.find(sy => sy.schoolYear === deadline.schoolYear);
          if (!schoolYear) continue;

          const semester = schoolYear.semesters.find(s => s.semester === deadline.semester);
          if (!semester) continue;

          // Check if student has unpaid payments
          const hasUnpaidPayments = semester.payments.some(payment => payment.status !== "paid");

          if (hasUnpaidPayments) {
            // Check if notification already sent for this deadline
            const existingNotification = await Notification.findOne({
              userId: student._id,
              type: "payment_deadline",
              "metadata.deadlineId": deadline._id,
              status: { $in: ["unread", "read"] }
            });

            if (!existingNotification) {
              // Send notification
              try {
                const notification = new Notification({
                  userId: student._id,
                  message: `Payment deadline approaching! Your payment for ${deadline.semester} semester ${deadline.schoolYear} is due on ${deadlineDate.toLocaleDateString()}. Please complete your payment to avoid penalties.`,
                  type: "payment_deadline",
                  status: "unread",
                  metadata: {
                    deadlineId: deadline._id,
                    schoolYear: deadline.schoolYear,
                    semester: deadline.semester,
                    deadlineDate: deadlineDate,
                    daysRemaining: Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24))
                  }
                });

                await notification.save();
                notificationCount++;
              } catch (saveError) {
                console.error(`Failed to save deadline notification for student ${student._id}:`, saveError);
              }
            }
          }
        }

        if (notificationCount > 0) {
          console.log(`Sent ${notificationCount} deadline notifications for ${deadline.schoolYear} ${deadline.semester} semester`);
        }
      }
    }

    console.log("Deadline notification check completed");
  } catch (error) {
    console.error("Error checking deadline notifications:", error);
  }
};

/**
 * Get deadline information for a specific student
 */
const getStudentDeadlineInfo = async (studentId, schoolYear, semester) => {
  try {
    const deadline = await PaymentDeadline.findOne({
      schoolYear,
      semester,
      isActive: true
    });

    if (!deadline) {
      return null;
    }

    const now = new Date();
    const deadlineDate = new Date(deadline.deadlineDate);
    const daysRemaining = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    return {
      deadlineDate,
      daysRemaining,
      notificationDays: deadline.notificationDays,
      isOverdue: daysRemaining < 0,
      description: deadline.description
    };
  } catch (error) {
    console.error("Error getting student deadline info:", error);
    return null;
  }
};

module.exports = {
  checkAndSendDeadlineNotifications,
  getStudentDeadlineInfo
};