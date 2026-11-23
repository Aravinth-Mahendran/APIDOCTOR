
const { Resend } = require("resend");
const Notification = require("../models/notification");

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing from environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// HTML ESCAPING
// ==========================================

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
};

// ==========================================
// PASSWORD RESET EMAIL
// ==========================================

const sendPasswordResetEmail = async (email, resetUrl) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: "Reset your APIDOCTOR password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:30px;color:#1e293b">
        <h1 style="color:#2563eb">APIDOCTOR</h1>
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your APIDOCTOR password.</p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#2563eb;color:white;padding:14px 24px;text-decoration:none;border-radius:8px">
          Reset Password
        </a>
        <p>This link expires in 15 minutes and can only be used once.</p>
      </div>
    `
  });

  if (error) {
    throw new Error(error.message || "Password reset email failed");
  }

  return data;
};

// ==========================================
// EMAIL VERIFICATION
// ==========================================

const sendVerificationEmail = async (email, verificationUrl) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: "Verify your APIDOCTOR email address",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto;padding:30px;color:#1e293b">
        <h1 style="color:#2563eb">APIDOCTOR</h1>
        <h2>Verify Your Email Address</h2>
        <p>Welcome to APIDOCTOR!</p>
        <p>Please verify your email address to activate your account.</p>
        <a href="${verificationUrl}"
          style="display:inline-block;background:#2563eb;color:white;padding:14px 24px;text-decoration:none;border-radius:8px">
          Verify Email
        </a>
        <p>This verification link expires in 24 hours.</p>
      </div>
    `
  });

  if (error) {
    throw new Error(error.message || "Verification email failed");
  }

  return data;
};

// ==========================================
// SAVE INCIDENT NOTIFICATION HISTORY
// ==========================================

const saveNotification = async ({
  email,
  monitor,
  incident,
  type,
  subject,
  status,
  messageId = null,
  errorMessage = null,
  attemptedAt
}) => {
  try {
    await Notification.create({
      userId: incident.userId || monitor.userId,
      monitorId: incident.monitorId || monitor._id,
      incidentId: incident._id,
      type,
      channel: "EMAIL",
      recipient: email,
      subject,
      status,
      providerMessageId: messageId,
      error: errorMessage,
      sentAt: status === "SENT" ? attemptedAt : null,
      attemptedAt
    });

    console.log(
      `Notification history saved: ${type} - ${status}`
    );
  } catch (loggingError) {
    // Do not hide the actual email delivery result.
    console.error(
      "Notification history logging failed:",
      loggingError.message
    );
  }
};

// ==========================================
// SEND AND TRACK INCIDENT EMAIL
// ==========================================

const sendTrackedIncidentEmail = async ({
  email,
  monitor,
  incident,
  type,
  subject,
  html
}) => {
  const attemptedAt = new Date();

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject,
      html
    });

    if (error) {
      throw new Error(error.message || "Email delivery failed");
    }

    await saveNotification({
      email,
      monitor,
      incident,
      type,
      subject,
      status: "SENT",
      messageId: data?.id || null,
      attemptedAt
    });

    console.log(`${type} email sent successfully`);

    return data;

  } catch (error) {
    await saveNotification({
      email,
      monitor,
      incident,
      type,
      subject,
      status: "FAILED",
      errorMessage: error.message || "Unknown email error",
      attemptedAt
    });

    console.error(
      `${type} email failed:`,
      error.message
    );

    throw error;
  }
};

// ==========================================
// INCIDENT ALERT EMAIL
// ==========================================

const sendIncidentAlertEmail = async (email, monitor, incident) => {
  const monitorName = escapeHtml(monitor.name);
  const monitorUrl = escapeHtml(monitor.url);
  const method = escapeHtml(monitor.method);

  const failureReason = escapeHtml(
    incident.lastError || "Unknown failure"
  );

  const statusCode = escapeHtml(
    incident.lastStatusCode ?? "Unavailable"
  );

  const detectedAt = escapeHtml(
    new Date(incident.startedAt).toLocaleString()
  );

  const subject = `[APIDOCTOR ALERT] ${monitor.name} is DOWN`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#1e293b;background:#f8fafc">

      <h1 style="color:#2563eb">APIDOCTOR</h1>

      <div style="background:#fee2e2;padding:18px;border-radius:10px">
        <h2 style="color:#dc2626;margin:0">
          API Incident Detected
        </h2>
        <p style="color:#991b1b">
          Your monitored API is currently DOWN.
        </p>
      </div>

      <h3>Monitor Details</h3>

      <p><strong>API Name:</strong> ${monitorName}</p>
      <p><strong>Endpoint:</strong> ${monitorUrl}</p>
      <p><strong>Method:</strong> ${method}</p>
      <p><strong>HTTP Status:</strong> ${statusCode}</p>
      <p><strong>Failure Reason:</strong> ${failureReason}</p>
      <p><strong>Detected At:</strong> ${detectedAt}</p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:25px 0"/>

      <p style="color:#64748b;font-size:13px">
        APIDOCTOR automatically detected this failure.
        You will receive another notification when the API recovers.
      </p>

      <p style="color:#64748b;font-size:12px">
        Monitor. Diagnose. Recover.
      </p>

    </div>
  `;

  return sendTrackedIncidentEmail({
    email,
    monitor,
    incident,
    type: "INCIDENT_ALERT",
    subject,
    html
  });
};

// ==========================================
// INCIDENT RECOVERY EMAIL
// ==========================================

const sendIncidentRecoveryEmail = async (email, monitor, incident) => {
  const monitorName = escapeHtml(monitor.name);
  const monitorUrl = escapeHtml(monitor.url);

  const recoveredAt = escapeHtml(
    new Date(incident.resolvedAt).toLocaleString()
  );

  const durationMs = Math.max(
    0,
    incident.durationMs || 0
  );

  const totalSeconds = Math.floor(durationMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const downtime = [
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    `${seconds}s`
  ].filter(Boolean).join(" ");

  const subject = `[APIDOCTOR RECOVERED] ${monitor.name} is UP`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#1e293b;background:#f8fafc">

      <h1 style="color:#2563eb">APIDOCTOR</h1>

      <div style="background:#dcfce7;padding:18px;border-radius:10px">
        <h2 style="color:#15803d;margin:0">
          API Successfully Recovered
        </h2>
        <p style="color:#166534">
          Your monitored API is responding successfully again.
        </p>
      </div>

      <h3>Recovery Details</h3>

      <p><strong>API Name:</strong> ${monitorName}</p>
      <p><strong>Endpoint:</strong> ${monitorUrl}</p>
      <p><strong>Recovered At:</strong> ${recoveredAt}</p>
      <p><strong>Total Downtime:</strong> ${escapeHtml(downtime)}</p>
      <p><strong>Failure Count:</strong> ${escapeHtml(incident.failureCount)}</p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:25px 0"/>

      <p style="color:#64748b;font-size:13px">
        APIDOCTOR detected that your API recovered and automatically resolved the incident.
      </p>

      <p style="color:#64748b;font-size:12px">
        Monitor. Diagnose. Recover.
      </p>

    </div>
  `;

  return sendTrackedIncidentEmail({
    email,
    monitor,
    incident,
    type: "INCIDENT_RECOVERY",
    subject,
    html
  });
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendIncidentAlertEmail,
  sendIncidentRecoveryEmail
};
