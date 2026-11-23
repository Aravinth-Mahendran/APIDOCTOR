
const mongoose = require("mongoose");

const monitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    url: {
      type: String,
      required: true,
      trim: true
    },

    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: "GET"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    interval: {
      type: Number,
      default: 1,
      min: 1,
      max: 1440,
      validate: {
        validator: Number.isInteger,
        message: "Interval must be a whole number"
      }
    },

    nextCheckAt: {
      type: Date,
      default: null
    },

    // Encrypted custom HTTP headers
    headersEncrypted: {
      type: String,
      default: null
    },

    // Custom JSON request payload
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    // Expected HTTP status codes
    expectedStatusCodes: {
      type: [Number],
      default: []
    },

    // Optional response keyword
    responseKeyword: {
      type: String,
      trim: true,
      default: null
    },

    // Response-time warning threshold (milliseconds)
    responseTimeWarningMs: {
      type: Number,
      default: 1000,
      min: 100,
      max: 60000,
      validate: {
        validator: Number.isInteger,
        message: "Warning threshold must be a whole number"
      }
    },

    // Response-time critical threshold (milliseconds)
    responseTimeCriticalMs: {
      type: Number,
      default: 3000,
      min: 200,
      max: 120000,
      validate: {
        validator: Number.isInteger,
        message: "Critical threshold must be a whole number"
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure critical threshold is greater than warning threshold
monitorSchema.pre("validate", function () {
  if (
    this.responseTimeCriticalMs <= this.responseTimeWarningMs
  ) {
    this.invalidate(
      "responseTimeCriticalMs",
      "Critical threshold must be greater than warning threshold"
    );
  }
});

monitorSchema.index({ isActive: 1, nextCheckAt: 1 });

module.exports = mongoose.model("Monitor", monitorSchema);
