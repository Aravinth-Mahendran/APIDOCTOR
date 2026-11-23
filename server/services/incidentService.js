
const Incident = require("../models/incident");
const User = require("../models/User");

const {
  sendIncidentAlertEmail,
  sendIncidentRecoveryEmail
} = require("./emailService");

// ==========================================
// SEND INCIDENT ALERT
// ==========================================

const notifyIncidentCreated = async (monitor, incident) => {
  try {
    const user = await User.findById(monitor.userId)
      .select("email isEmailVerified");

    if (!user || !user.email || !user.isEmailVerified) {
      console.log("Incident alert skipped: verified email unavailable.");
      return;
    }

    await sendIncidentAlertEmail(
      user.email,
      monitor,
      incident
    );

    console.log("Incident alert email processed:", user.email);

  } catch (error) {
    console.error("Incident alert email failed:", error.message);
  }
};

// ==========================================
// SEND RECOVERY NOTIFICATION
// ==========================================

const notifyIncidentRecovered = async (monitor, incident) => {
  try {
    const user = await User.findById(monitor.userId)
      .select("email isEmailVerified");

    if (!user || !user.email || !user.isEmailVerified) {
      console.log("Recovery email skipped: verified email unavailable.");
      return;
    }

    await sendIncidentRecoveryEmail(
      user.email,
      monitor,
      incident
    );

    console.log("Recovery email processed:", user.email);

  } catch (error) {
    console.error("Recovery email failed:", error.message);
  }
};

// ==========================================
// HANDLE API FAILURE
// ==========================================

const handleIncidentFailure = async (monitor, result, checkedAt) => {
  try {
    const existingIncident = await Incident.findOneAndUpdate(
      {
        monitorId: monitor._id,
        status: "OPEN"
      },
      {
        $inc: { failureCount: 1 },
        $set: {
          lastFailureAt: checkedAt,
          lastError: result.error || null,
          lastStatusCode: result.statusCode ?? null
        }
      },
      { new: true }
    );

    if (existingIncident) {
      console.log("Existing incident updated:", existingIncident._id);
      return existingIncident;
    }

    try {
      const incident = await Incident.create({
        monitorId: monitor._id,
        userId: monitor.userId,
        status: "OPEN",
        startedAt: checkedAt,
        lastFailureAt: checkedAt,
        failureCount: 1,
        lastError: result.error || null,
        lastStatusCode: result.statusCode ?? null
      });

      console.log("NEW INCIDENT CREATED:", incident._id);

      await notifyIncidentCreated(monitor, incident);

      return incident;

    } catch (createError) {
      if (createError.code === 11000) {
        const concurrentIncident = await Incident.findOneAndUpdate(
          {
            monitorId: monitor._id,
            status: "OPEN"
          },
          {
            $inc: { failureCount: 1 },
            $set: {
              lastFailureAt: checkedAt,
              lastError: result.error || null,
              lastStatusCode: result.statusCode ?? null
            }
          },
          { new: true }
        );

        if (concurrentIncident) {
          console.log(
            "Concurrent incident updated:",
            concurrentIncident._id
          );

          return concurrentIncident;
        }
      }

      throw createError;
    }

  } catch (error) {
    console.error("Incident failure handling error:", error.message);
    throw error;
  }
};

// ==========================================
// HANDLE API RECOVERY
// ==========================================

const handleIncidentRecovery = async (monitor, checkedAt) => {
  try {
    const incident = await Incident.findOneAndUpdate(
      {
        monitorId: monitor._id,
        status: "OPEN"
      },
      [
        {
          $set: {
            status: "RESOLVED",
            resolvedAt: checkedAt,
            durationMs: {
              $max: [
                0,
                {
                  $subtract: [
                    checkedAt,
                    "$startedAt"
                  ]
                }
              ]
            }
          }
        }
      ],
      { new: true }
    );

    if (!incident) {
      return null;
    }

    console.log("INCIDENT RESOLVED:", incident._id);
    console.log("Total downtime:", incident.durationMs, "ms");

    await notifyIncidentRecovered(monitor, incident);

    return incident;

  } catch (error) {
    console.error("Incident recovery handling error:", error.message);
    throw error;
  }
};

module.exports = {
  handleIncidentFailure,
  handleIncidentRecovery
};
