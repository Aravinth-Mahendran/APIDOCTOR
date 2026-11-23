
import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import "./notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ sent: 0, failed: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 10
      };

      if (status !== "ALL") params.status = status;
      if (type !== "ALL") params.type = type;

      const response = await API.get("/notifications", { params });

      setNotifications(response.data.notifications || []);
      setSummary(response.data.summary || { sent: 0, failed: 0 });
      setTotal(response.data.total || 0);
      setTotalPages(Math.max(1, response.data.totalPages || 1));

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load notification history."
      );
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
    setSelectedNotification(null);
  };

  const changeType = (value) => {
    setType(value);
    setPage(1);
    setSelectedNotification(null);
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const getTypeLabel = (value) => {
    return value === "INCIDENT_ALERT"
      ? "Incident Alert"
      : "Recovery";
  };

  const formatDuration = (milliseconds) => {
    if (milliseconds == null) return "—";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours ? `${hours}h` : "",
      minutes ? `${minutes}m` : "",
      `${seconds}s`
    ].filter(Boolean).join(" ");
  };

  return (
    <div className="notification-page">

      <div className="notification-heading">
        <div>
          <h1>Notification History</h1>
          <p>Track your incident alerts and recovery emails.</p>
        </div>

        <button
          className="notification-refresh"
          onClick={fetchNotifications}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div className="notification-stats">

        <div className="notification-stat-card">
          <span>Total Notifications</span>
          <h2>{total}</h2>
          <small>All recorded attempts</small>
        </div>

        <div className="notification-stat-card">
          <span>Successfully Sent</span>
          <h2 className="notification-green">{summary.sent}</h2>
          <small>Accepted by email provider</small>
        </div>

        <div className="notification-stat-card">
          <span>Failed Attempts</span>
          <h2 className="notification-red">{summary.failed}</h2>
          <small>Requires attention</small>
        </div>

      </div>

      {/* FILTERS */}

      <div className="notification-toolbar">

        <div className="notification-filter">
          <label>Status</label>

          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="notification-filter">
          <label>Notification Type</label>

          <select
            value={type}
            onChange={(e) => changeType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="INCIDENT_ALERT">Incident Alert</option>
            <option value="INCIDENT_RECOVERY">Recovery</option>
          </select>
        </div>

        <div className="notification-result-count">
          {total} notification(s)
        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="notification-error">
          {error}
          <button onClick={fetchNotifications}>Retry</button>
        </div>
      )}

      {/* TABLE */}

      <div className="notification-table-container">

        <table className="notification-table">

          <thead>
            <tr>
              <th>API / Monitor</th>
              <th>Event</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Attempted At</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td colSpan="6" className="notification-empty">
                  Loading notifications...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan="6" className="notification-empty">
                  No notifications found.
                </td>
              </tr>
            ) : (
              notifications.map((notification) => (
                <tr key={notification._id}>

                  <td>
                    <strong>
                      {notification.monitorId?.name || "Deleted monitor"}
                    </strong>
                    <small>
                      {notification.monitorId?.method || "—"}
                    </small>
                  </td>

                  <td>
                    <span
                      className={`notification-type ${
                        notification.type === "INCIDENT_ALERT"
                          ? "alert-type"
                          : "recovery-type"
                      }`}
                    >
                      {getTypeLabel(notification.type)}
                    </span>
                  </td>

                  <td className="notification-recipient">
                    {notification.recipient}
                  </td>

                  <td>
                    <span
                      className={`notification-status ${
                        notification.status === "SENT"
                          ? "sent-status"
                          : "failed-status"
                      }`}
                    >
                      {notification.status}
                    </span>
                  </td>

                  <td>{formatDate(notification.attemptedAt)}</td>

                  <td>
                    <button
                      className="notification-view"
                      onClick={() =>
                        setSelectedNotification(
                          selectedNotification?._id === notification._id
                            ? null
                            : notification
                        )
                      }
                    >
                      {selectedNotification?._id === notification._id
                        ? "Close"
                        : "View"}
                    </button>
                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      {/* NOTIFICATION DETAILS */}

      {selectedNotification && (
        <div className="notification-detail">

          <div className="notification-detail-header">
            <div>
              <h3>Notification Details</h3>
              <p>{selectedNotification.subject}</p>
            </div>

            <button
              onClick={() => setSelectedNotification(null)}
            >
              ✕
            </button>
          </div>

          <div className="notification-detail-grid">

            <div>
              <label>Notification ID</label>
              <p>{selectedNotification._id}</p>
            </div>

            <div>
              <label>Notification Type</label>
              <p>{getTypeLabel(selectedNotification.type)}</p>
            </div>

            <div>
              <label>Recipient</label>
              <p>{selectedNotification.recipient}</p>
            </div>

            <div>
              <label>Delivery Status</label>
              <p>{selectedNotification.status}</p>
            </div>

            <div>
              <label>Provider Message ID</label>
              <p>{selectedNotification.providerMessageId || "Unavailable"}</p>
            </div>

            <div>
              <label>Attempted At</label>
              <p>{formatDate(selectedNotification.attemptedAt)}</p>
            </div>

            <div>
              <label>Successfully Sent At</label>
              <p>{formatDate(selectedNotification.sentAt)}</p>
            </div>

            <div>
              <label>Monitor Endpoint</label>
              <p>{selectedNotification.monitorId?.url || "Unavailable"}</p>
            </div>

            <div>
              <label>Incident Downtime</label>
              <p>
                {formatDuration(
                  selectedNotification.incidentId?.durationMs
                )}
              </p>
            </div>

          </div>

          {selectedNotification.error && (
            <div className="notification-error-details">
              <strong>Delivery Error</strong>
              <p>{selectedNotification.error}</p>
            </div>
          )}

        </div>
      )}

      {/* PAGINATION */}

      <div className="notification-pagination">

        <span>
          Page {page} of {totalPages}
        </span>

        <div>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((previous) => previous - 1)}
          >
            Previous
          </button>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage((previous) => previous + 1)}
          >
            Next
          </button>
        </div>

      </div>

    </div>
  );
};

export default Notifications;
