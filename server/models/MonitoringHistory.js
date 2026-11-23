
const mongoose = require("mongoose");

const monitoringHistorySchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true
    },

    // Overall API availability
    status: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true
    },

    statusCode: {
      type: Number,
      default: null
    },

    // API response time in milliseconds
    responseTime: {
      type: Number,
      default: 0
    },

    // Performance classification independent of UP/DOWN
        performanceStatus: {
    type: String,
    enum: ["HEALTHY", "SLOW", "CRITICAL", "UNKNOWN"],
    default: "UNKNOWN"
    },

    error: {
      type: String,
      default: null
    },

    checkedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Retrieve recent history efficiently
monitoringHistorySchema.index({
  monitorId: 1,
  checkedAt: -1
});

// Retrieve performance history efficiently
monitoringHistorySchema.index({
  monitorId: 1,
  performanceStatus: 1,
  checkedAt: -1
});

module.exports = mongoose.model(
  "MonitoringHistory",
  monitoringHistorySchema
);
