
const Notification = require("../models/notification");

// ==========================================
// GET NOTIFICATION HISTORY
// ==========================================

const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type
    } = req.query;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(
      50,
      Math.max(1, parseInt(limit, 10) || 10)
    );

    const filter = {
      userId: req.user.id
    };

    if (["SENT", "FAILED"].includes(status)) {
      filter.status = status;
    }

    if (["INCIDENT_ALERT", "INCIDENT_RECOVERY"].includes(type)) {
      filter.type = type;
    }

    const [notifications, total, sent, failed] = await Promise.all([
      Notification.find(filter)
        .populate("monitorId", "name url method")
        .populate("incidentId", "status startedAt resolvedAt durationMs")
        .sort({ attemptedAt: -1 })
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit)
        .lean(),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        ...filter,
        status: "SENT"
      }),

      Notification.countDocuments({
        ...filter,
        status: "FAILED"
      })
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
      summary: {
        sent,
        failed
      },
      notifications
    });

  } catch (error) {
    console.error("Get notifications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification history"
    });
  }
};

module.exports = {
  getNotifications
};
