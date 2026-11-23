
const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["OPEN", "RESOLVED"],
      default: "OPEN",
      required: true
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    lastFailureAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    durationMs: {
      type: Number,
      default: null
    },

    failureCount: {
      type: Number,
      default: 1
    },

    lastError: {
      type: String,
      default: null
    },

    lastStatusCode: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Only one OPEN incident per monitor.
incidentSchema.index(
  { monitorId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "OPEN"
    }
  }
);

// Retrieve incidents for a monitor, newest first.
incidentSchema.index({
  monitorId: 1,
  startedAt: -1
});

// Retrieve incidents belonging to a user.
incidentSchema.index({
  userId: 1,
  startedAt: -1
});

module.exports = mongoose.model("Incident", incidentSchema);
