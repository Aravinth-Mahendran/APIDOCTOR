
const cron = require("node-cron");

const Monitor = require("../models/Monitor");
const MonitoringHistory = require("../models/MonitoringHistory");

const checkAPI = require("./healthCheck");
const { decrypt } = require("../utils/crypto");

const {
  handleIncidentFailure,
  handleIncidentRecovery
} = require("./incidentService");

let isRunning = false;

// ==========================================
// START MONITORING SCHEDULER
// ==========================================

const startMonitoring = () => {
  console.log("APIDOCTOR monitoring scheduler started!");

  cron.schedule("* * * * *", async () => {

    // Prevent overlapping cycles in this process
    if (isRunning) {
      console.log(
        "Previous monitoring cycle is still running. Skipping..."
      );
      return;
    }

    isRunning = true;

    console.log("\n========== APIDOCTOR MONITORING ==========");
    console.log("Time:", new Date().toLocaleString());

    try {
      const now = new Date();

      // Find active monitors that are due
      const dueMonitors = await Monitor.find({
        isActive: true,
        $or: [
          { nextCheckAt: null },
          { nextCheckAt: { $exists: false } },
          { nextCheckAt: { $lte: now } }
        ]
      }).select("_id");

      console.log(
        "Monitors due for checking:",
        dueMonitors.length
      );

      for (const dueMonitor of dueMonitors) {
        try {
          const checkStartedAt = new Date();

          // Calculate next scheduled check
          const claimedNextCheckAt = new Date(
            checkStartedAt.getTime() + 60 * 1000
          );

          // Atomically claim this monitor
          const claimedMonitor = await Monitor.findOneAndUpdate(
            {
              _id: dueMonitor._id,
              isActive: true,
              $or: [
                { nextCheckAt: null },
                { nextCheckAt: { $exists: false } },
                { nextCheckAt: { $lte: checkStartedAt } }
              ]
            },
            {
              $set: {
                nextCheckAt: claimedNextCheckAt
              }
            },
            {
              returnDocument: "after"
            }
          );

          if (!claimedMonitor) {
            continue;
          }

          // Apply configured monitoring interval
          const nextCheckAt = new Date(
            checkStartedAt.getTime() +
            claimedMonitor.interval * 60 * 1000
          );

          await Monitor.updateOne(
            {
              _id: claimedMonitor._id,
              nextCheckAt: claimedNextCheckAt
            },
            {
              $set: {
                nextCheckAt
              }
            }
          );

          console.log("--------------------------------");
          console.log("API:", claimedMonitor.name);
          console.log("URL:", claimedMonitor.url);
          console.log("Method:", claimedMonitor.method);
          console.log(
            "Interval:",
            claimedMonitor.interval,
            "minute(s)"
          );

          let result;

          try {
            // Decrypt stored headers only at runtime
            let decryptedHeaders = {};

            if (claimedMonitor.headersEncrypted) {
              const decryptedValue = decrypt(
                claimedMonitor.headersEncrypted
              );

              decryptedHeaders = JSON.parse(decryptedValue);

              if (
                !decryptedHeaders ||
                typeof decryptedHeaders !== "object" ||
                Array.isArray(decryptedHeaders)
              ) {
                throw new Error(
                  "Invalid decrypted header configuration"
                );
              }
            }

            // Build runtime monitor configuration
            const monitorConfig = claimedMonitor.toObject();

            delete monitorConfig.headersEncrypted;

            monitorConfig.headers = decryptedHeaders;

            // Perform health check
            result = await checkAPI(monitorConfig);

          } catch (checkError) {
            console.error(
              "Monitor configuration error:",
              checkError.message
            );

            result = {
                url: claimedMonitor.url,
                method: claimedMonitor.method,
                status: "DOWN",
                statusCode: null,
                responseTime: 0,
                performanceStatus: "UNKNOWN",
                error:
                    "Monitor configuration or credential decryption failed"
};
          }

          console.log("Status:", result.status);
          console.log("HTTP Code:", result.statusCode);
          console.log(
            "Response Time:",
            result.responseTime,
            "ms"
          );
          console.log("Error:", result.error);
          console.log("Performance:", result.performanceStatus || "UNKNOWN");
          console.log(
            "Next Check:",
            nextCheckAt.toLocaleString()
          );

          // ==========================================
          // SAVE MONITORING HISTORY
          // ==========================================

          const checkedAt = new Date();

                    await MonitoringHistory.create({
            monitorId: claimedMonitor._id,
            status: result.status,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            performanceStatus: result.performanceStatus || "UNKNOWN",
            error: result.error || null,
            checkedAt
});

          console.log("Monitoring history saved!");

          // ==========================================
          // INCIDENT MANAGEMENT
          // ==========================================

          try {
            if (result.status === "DOWN") {
              await handleIncidentFailure(
                claimedMonitor,
                result,
                checkedAt
              );

            } else if (result.status === "UP") {
              await handleIncidentRecovery(
                claimedMonitor,
                checkedAt
              );
            }

          } catch (incidentError) {
            // Incident errors should not stop other monitors
            console.error(
              "Incident management error:",
              incidentError.message
            );
          }

        } catch (monitorError) {
          console.error(
            `Error monitoring ${dueMonitor._id}:`,
            monitorError.message
          );
        }
      }

    } catch (error) {
      console.error(
        "Monitoring scheduler error:",
        error.message
      );

    } finally {
      isRunning = false;
    }
  });
};

module.exports = startMonitoring;
