
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true
    },

    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true
    },

    type: {
      type: String,
      enum: ["INCIDENT_ALERT", "INCIDENT_RECOVERY"],
      required: true
    },

    channel: {
      type: String,
      enum: ["EMAIL"],
      default: "EMAIL"
    },

    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    subject: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["SENT", "FAILED"],
      required: true
    },

    providerMessageId: {
      type: String,
      default: null
    },

    error: {
      type: String,
      default: null
    },

    sentAt: {
      type: Date,
      default: null
    },

    attemptedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ userId: 1, attemptedAt: -1 });
notificationSchema.index({ incidentId: 1, attemptedAt: -1 });

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
