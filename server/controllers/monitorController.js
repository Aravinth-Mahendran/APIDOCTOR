
const mongoose = require("mongoose");

const Monitor = require("../models/Monitor");
const MonitoringHistory = require("../models/MonitoringHistory");
const { encrypt } = require("../utils/crypto");

// ==========================================
// CONFIGURATION
// ==========================================

const HISTORY_RANGES = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 50000;

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
];

// ==========================================
// HELPER: SANITIZE MONITOR
// ==========================================

const sanitizeMonitor = (monitor) => {
  const data = monitor.toObject
    ? monitor.toObject()
    : { ...monitor };

  delete data.headers;
  delete data.headersEncrypted;

  return data;
};

// ==========================================
// HELPER: VALIDATE CONFIGURATION
// ==========================================

const validateMonitorConfig = (data) => {
  if (data.headers !== undefined) {
    if (
      !data.headers ||
      typeof data.headers !== "object" ||
      Array.isArray(data.headers)
    ) {
      return "Headers must be a JSON object";
    }

    const blockedHeaders = [
      "host",
      "content-length",
      "connection",
      "transfer-encoding"
    ];

    for (const [key, value] of Object.entries(data.headers)) {
      if (
        !key.trim() ||
        blockedHeaders.includes(key.toLowerCase()) ||
        typeof value !== "string" ||
        /[\r\n]/.test(key) ||
        /[\r\n]/.test(value)
      ) {
        return `Invalid or unsupported header: ${key}`;
      }
    }
  }

  if (data.expectedStatusCodes !== undefined) {
    if (
      !Array.isArray(data.expectedStatusCodes) ||
      data.expectedStatusCodes.some(
        (code) =>
          !Number.isInteger(code) ||
          code < 100 ||
          code > 599
      )
    ) {
      return "Expected status codes must be integers between 100 and 599";
    }
  }

  if (
    data.responseKeyword !== undefined &&
    data.responseKeyword !== null &&
    (
      typeof data.responseKeyword !== "string" ||
      data.responseKeyword.length > 200
    )
  ) {
    return "Response keyword must be a string of up to 200 characters";
  }

  if (
    data.requestBody !== undefined &&
    data.requestBody !== null &&
    (
      typeof data.requestBody !== "object" ||
      Array.isArray(data.requestBody)
    )
  ) {
    return "Request body must be a JSON object or null";
  }
  // Validate response-time warning threshold
if (data.responseTimeWarningMs !== undefined) {
  if (
    !Number.isInteger(data.responseTimeWarningMs) ||
    data.responseTimeWarningMs < 100 ||
    data.responseTimeWarningMs > 60000
  ) {
    return "Warning threshold must be between 100 and 60000 milliseconds";
  }
}

// Validate response-time critical threshold
if (data.responseTimeCriticalMs !== undefined) {
  if (
    !Number.isInteger(data.responseTimeCriticalMs) ||
    data.responseTimeCriticalMs < 200 ||
    data.responseTimeCriticalMs > 120000
  ) {
    return "Critical threshold must be between 200 and 120000 milliseconds";
  }
}

// Critical must be greater than warning
if (
  data.responseTimeWarningMs !== undefined &&
  data.responseTimeCriticalMs !== undefined &&
  data.responseTimeCriticalMs <= data.responseTimeWarningMs
) {
  return "Critical threshold must be greater than warning threshold";
}

  return null;
};

// ==========================================
// 1. CREATE MONITOR
// POST /api/monitors
// ==========================================

const createMonitor = async (req, res) => {
  try {
    const {
  name,
  url,
  method,
  interval,
  headers,
  requestBody,
  expectedStatusCodes,
  responseKeyword,
  responseTimeWarningMs,
  responseTimeCriticalMs
} = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof url !== "string" ||
      !url.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and URL are required"
      });
    }

    // Validate URL protocol
    try {
      const parsedURL = new URL(url);

      if (!["http:", "https:"].includes(parsedURL.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid HTTP or HTTPS URL"
      });
    }

    // Validate method
    const selectedMethod = method || "GET";

    if (!ALLOWED_METHODS.includes(selectedMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid HTTP method"
      });
    }

    // Validate interval
    const selectedInterval = interval ?? 1;

    if (
      !Number.isInteger(Number(selectedInterval)) ||
      Number(selectedInterval) < 1 ||
      Number(selectedInterval) > 1440
    ) {
      return res.status(400).json({
        success: false,
        message: "Interval must be between 1 and 1440 minutes"
      });
    }

    // Validate advanced configuration
    const configError = validateMonitorConfig({
      headers,
      requestBody,
      expectedStatusCodes,
      responseKeyword
    });

    if (configError) {
      return res.status(400).json({
        success: false,
        message: configError
      });
    }

    // Encrypt headers
    const encryptedHeaders =
      headers && Object.keys(headers).length > 0
        ? encrypt(JSON.stringify(headers))
        : null;

    // Assign monitor to authenticated user
    const monitor = await Monitor.create({
      userId: req.user.id,
      name: name.trim(),
      url: url.trim(),
      method: selectedMethod,
      interval: Number(selectedInterval),
      headersEncrypted: encryptedHeaders,
      responseTimeWarningMs: responseTimeWarningMs ?? 1000,
      responseTimeCriticalMs: responseTimeCriticalMs ?? 3000,
      requestBody: requestBody ?? null,
      expectedStatusCodes: expectedStatusCodes || [],
      responseKeyword: responseKeyword || null
    });

    return res.status(201).json({
      success: true,
      message: "Monitor created successfully",
      data: sanitizeMonitor(monitor)
    });

  } catch (error) {
    console.error("Create monitor error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create monitor"
    });
  }
};

// ==========================================
// 2. GET ALL USER MONITORS
// GET /api/monitors
// ==========================================

const getMonitors = async (req, res) => {
  try {
    // Only retrieve monitors belonging to logged-in user
    const monitors = await Monitor.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .lean();

    const safeMonitors = monitors.map(sanitizeMonitor);

    return res.status(200).json({
      success: true,
      count: safeMonitors.length,
      data: safeMonitors
    });

  } catch (error) {
    console.error("Get monitors error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve monitors"
    });
  }
};

// ==========================================
// 3. UPDATE MONITOR
// PUT /api/monitors/:id
// ==========================================

const updateMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid monitor ID"
      });
    }

    const allowedFields = [
  "name",
  "url",
  "method",
  "interval",
  "isActive",
  "headers",
  "requestBody",
  "expectedStatusCodes",
  "responseKeyword",
  "responseTimeWarningMs",
  "responseTimeCriticalMs"
];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }

    // Validate name
    if (updates.name !== undefined) {
      if (
        typeof updates.name !== "string" ||
        !updates.name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Monitor name cannot be empty"
        });
      }

      updates.name = updates.name.trim();
    }

    // Validate URL
    if (updates.url !== undefined) {
      try {
        if (typeof updates.url !== "string") {
          throw new Error("Invalid URL");
        }

        const parsedURL = new URL(updates.url);

        if (!["http:", "https:"].includes(parsedURL.protocol)) {
          throw new Error("Invalid protocol");
        }

        updates.url = updates.url.trim();

      } catch {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid HTTP or HTTPS URL"
        });
      }
    }

    // Validate HTTP method
    if (
      updates.method !== undefined &&
      !ALLOWED_METHODS.includes(updates.method)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid HTTP method"
      });
    }

    // Validate interval
    if (updates.interval !== undefined) {
      if (
        !Number.isInteger(Number(updates.interval)) ||
        Number(updates.interval) < 1 ||
        Number(updates.interval) > 1440
      ) {
        return res.status(400).json({
          success: false,
          message: "Interval must be between 1 and 1440 minutes"
        });
      }

      updates.interval = Number(updates.interval);
    }

    // Validate active status
    if (
      updates.isActive !== undefined &&
      typeof updates.isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean"
      });
    }

    // Validate advanced configuration
    const existingMonitor = await Monitor.findOne({
  _id: id,
  userId: req.user.id
});

if (!existingMonitor) {
  return res.status(404).json({
    success: false,
    message: "Monitor not found"
  });
}

const configError = validateMonitorConfig({
  ...updates,
  responseTimeWarningMs:
    updates.responseTimeWarningMs ??
    existingMonitor.responseTimeWarningMs ??
    1000,

  responseTimeCriticalMs:
    updates.responseTimeCriticalMs ??
    existingMonitor.responseTimeCriticalMs ??
    3000
});

    // Encrypt updated headers
    if (updates.headers !== undefined) {
      updates.headersEncrypted =
        Object.keys(updates.headers).length > 0
          ? encrypt(JSON.stringify(updates.headers))
          : null;

      delete updates.headers;
    }

    // IMPORTANT: Find monitor by BOTH ID and owner
    const monitor = existingMonitor;

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    Object.assign(monitor, updates);

    // Reschedule when configuration changes
    if (
      updates.interval !== undefined ||
      updates.url !== undefined ||
      updates.method !== undefined ||
      updates.headersEncrypted !== undefined ||
      updates.requestBody !== undefined ||
      updates.responseTimeWarningMs !== undefined ||
      updates.responseTimeCriticalMs !== undefined ||
      updates.expectedStatusCodes !== undefined ||
      updates.responseKeyword !== undefined ||
      updates.isActive === true
    ) {
      monitor.nextCheckAt = null;
    }

    await monitor.save();

    return res.status(200).json({
      success: true,
      message: "Monitor updated successfully",
      data: sanitizeMonitor(monitor)
    });

  }  catch (error) {
  console.error("Update monitor error:", error.message);

  // Return validation errors as HTTP 400
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", ")
    });
  }

  return res.status(500).json({
    success: false,
    message: "Failed to update monitor"
  });
}
};

// ==========================================
// 4. DELETE MONITOR
// DELETE /api/monitors/:id
// ==========================================

const deleteMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid monitor ID"
      });
    }

    // Delete only if monitor belongs to authenticated user
    const monitor = await Monitor.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    // Delete associated history
    await MonitoringHistory.deleteMany({
      monitorId: monitor._id
    });

    return res.status(200).json({
      success: true,
      message: "Monitor and associated history deleted successfully"
    });

  } catch (error) {
    console.error("Delete monitor error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete monitor"
    });
  }
};

// ==========================================
// 5. GET MONITORING HISTORY
// GET /api/monitors/:id/history?range=24h
// ==========================================

const getMonitorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { range, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid monitor ID"
      });
    }

    // Verify ownership before accessing history
    const monitor = await Monitor.findOne({
      _id: id,
      userId: req.user.id
    }).lean();

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    if (range && !HISTORY_RANGES[range]) {
      return res.status(400).json({
        success: false,
        message: "Invalid range. Use 1h, 24h, 7d or 30d"
      });
    }

    let recordLimit = range
      ? MAX_HISTORY_LIMIT
      : DEFAULT_HISTORY_LIMIT;

    if (limit !== undefined) {
      const parsedLimit = Number(limit);

      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > MAX_HISTORY_LIMIT
      ) {
        return res.status(400).json({
          success: false,
          message: `Limit must be between 1 and ${MAX_HISTORY_LIMIT}`
        });
      }

      recordLimit = parsedLimit;
    }

    const now = new Date();

    const historyQuery = {
      monitorId: monitor._id
    };

    let from = null;

    if (range) {
      from = new Date(
        now.getTime() - HISTORY_RANGES[range]
      );

      historyQuery.checkedAt = {
        $gte: from,
        $lte: now
      };
    }

    const history = await MonitoringHistory.find(historyQuery)
      .sort({ checkedAt: -1 })
      .limit(recordLimit)
      .lean();

    return res.status(200).json({
      success: true,
      monitor: monitor.name,
      range: range || "latest",
      from,
      to: now,
      count: history.length,
      limit: recordLimit,
      data: history
    });

  } catch (error) {
    console.error("History retrieval error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve monitoring history"
    });
  }
};

// ==========================================
// 6. GET MONITOR STATISTICS
// GET /api/monitors/:id/stats
// ==========================================

const getMonitorStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid monitor ID"
      });
    }

    // Verify ownership before accessing statistics
    const monitor = await Monitor.findOne({
      _id: id,
      userId: req.user.id
    }).lean();

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: "Monitor not found"
      });
    }

    const result = await MonitoringHistory.aggregate([
      {
        $match: {
          monitorId: monitor._id
        }
      },
      {
        $group: {
          _id: null,

          totalChecks: {
            $sum: 1
          },

          successfulChecks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "UP"] },
                1,
                0
              ]
            }
          },

          failedChecks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "DOWN"] },
                1,
                0
              ]
            }
          },

          averageResponseTime: {
            $avg: {
              $cond: [
                { $eq: ["$status", "UP"] },
                "$responseTime",
                null
              ]
            }
          },

          fastestResponse: {
            $min: {
              $cond: [
                { $eq: ["$status", "UP"] },
                "$responseTime",
                null
              ]
            }
          },

          slowestResponse: {
            $max: {
              $cond: [
                { $eq: ["$status", "UP"] },
                "$responseTime",
                null
              ]
            }
          }
        }
      }
    ]);

    const stats = result[0] || {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      fastestResponse: null,
      slowestResponse: null
    };

    const uptimePercentage = stats.totalChecks > 0
      ? Number(
          (
            (stats.successfulChecks / stats.totalChecks) * 100
          ).toFixed(2)
        )
      : 0;

    return res.status(200).json({
      success: true,
      monitor: monitor.name,

      statistics: {
        totalChecks: stats.totalChecks,
        successfulChecks: stats.successfulChecks,
        failedChecks: stats.failedChecks,
        uptimePercentage,

        averageResponseTime: Math.round(
          stats.averageResponseTime || 0
        ),

        fastestResponse: stats.fastestResponse ?? 0,
        slowestResponse: stats.slowestResponse ?? 0
      }
    });

  } catch (error) {
    console.error("Statistics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve monitor statistics"
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createMonitor,
  getMonitors,
  updateMonitor,
  deleteMonitor,
  getMonitorHistory,
  getMonitorStats
};
