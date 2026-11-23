
import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/axios";

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedIncident, setSelectedIncident] = useState(null);

  // ==========================================
  // FETCH INCIDENTS
  // ==========================================

  const fetchIncidents = useCallback(async () => {
    try {
      setError("");

      const response = await API.get("/incidents");
      const data = response.data.incidents || [];

      setIncidents(data);

      // Keep selected incident updated after refresh
      setSelectedIncident((current) => {
        if (!current) return null;

        return data.find(
          (item) => item._id === current._id
        ) || null;
      });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load incidents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();

    const timer = setInterval(fetchIncidents, 30000);

    return () => clearInterval(timer);
  }, [fetchIncidents]);

  // ==========================================
  // INCIDENT STATISTICS
  // ==========================================

  const openCount = incidents.filter(
    (incident) => incident.status === "OPEN"
  ).length;

  const resolvedCount = incidents.filter(
    (incident) => incident.status === "RESOLVED"
  ).length;

  const filteredIncidents = useMemo(() => {
    if (filter === "ALL") return incidents;

    return incidents.filter(
      (incident) => incident.status === filter
    );
  }, [incidents, filter]);

  // ==========================================
  // FORMAT HELPERS
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString();
  };

  const formatDuration = (durationMs) => {
    if (durationMs === null || durationMs === undefined) {
      return "Ongoing";
    }

    const totalSeconds = Math.max(
      0,
      Math.floor(durationMs / 1000)
    );

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  };

  const getCurrentDuration = (incident) => {
    if (incident.status === "RESOLVED") {
      return incident.durationMs;
    }

    return Math.max(
      0,
      Date.now() - new Date(incident.startedAt).getTime()
    );
  };

  // ==========================================
  // INCIDENT DETAILS VIEW
  // ==========================================

  const renderIncidentDetails = () => {
    const incident = selectedIncident;

    if (!incident) return null;

    const isOpen = incident.status === "OPEN";

    return (
      <div className="incident-details-page">

        {/* DETAILS HEADER */}

        <div className="incident-details-heading">

          <button
            className="incident-back-btn"
            onClick={() => setSelectedIncident(null)}
            type="button"
          >
            ← Back to Incidents
          </button>

          <div className="incident-details-title">
            <div>
              <span className="incidents-eyebrow">
                INCIDENT INVESTIGATION
              </span>

              <h2>
                {incident.monitorId?.name || "Deleted Monitor"}
              </h2>

              <p>
                Incident ID: {incident._id}
              </p>
            </div>

            <span
              className={`incident-status ${
                isOpen
                  ? "incident-open"
                  : "incident-resolved"
              }`}
            >
              {incident.status}
            </span>
          </div>
        </div>

        {/* STATUS BANNER */}

        <div
          className={`incident-detail-banner ${
            isOpen ? "banner-open" : "banner-resolved"
          }`}
        >
          <div className="incident-banner-icon">
            {isOpen ? "!" : "✓"}
          </div>

          <div>
            <h3>
              {isOpen
                ? "Incident is currently ongoing"
                : "Incident successfully resolved"}
            </h3>

            <p>
              {isOpen
                ? "The monitoring system is still detecting API failures."
                : `The API recovered on ${formatDate(incident.resolvedAt)}.`}
            </p>
          </div>
        </div>

        {/* SUMMARY */}

        <div className="incident-detail-stats">

          <div className="incident-detail-stat">
            <span>Downtime</span>

            <strong>
              {formatDuration(getCurrentDuration(incident))}
            </strong>
          </div>

          <div className="incident-detail-stat">
            <span>Total Failures</span>

            <strong>{incident.failureCount}</strong>
          </div>

          <div className="incident-detail-stat">
            <span>HTTP Status</span>

            <strong>
              {incident.lastStatusCode ?? "N/A"}
            </strong>
          </div>

        </div>

        {/* API INFORMATION */}

        <div className="incident-detail-panel">

          <div className="incident-panel-heading">
            <h3>API Information</h3>
            <span>MONITOR DETAILS</span>
          </div>

          <div className="incident-information-grid">

            <div>
              <span>Monitor Name</span>
              <strong>
                {incident.monitorId?.name || "Deleted Monitor"}
              </strong>
            </div>

            <div>
              <span>HTTP Method</span>
              <strong>
                {incident.monitorId?.method || "—"}
              </strong>
            </div>

            <div className="incident-full-width">
              <span>Endpoint URL</span>
              <strong className="incident-url">
                {incident.monitorId?.url || "Monitor unavailable"}
              </strong>
            </div>

            <div className="incident-full-width">
              <span>Latest Failure Reason</span>
              <strong className="incident-error-text">
                {incident.lastError || "Unknown failure"}
              </strong>
            </div>

          </div>
        </div>

        {/* INCIDENT TIMELINE */}

        <div className="incident-detail-panel">

          <div className="incident-panel-heading">
            <h3>Incident Timeline</h3>
            <span>EVENT HISTORY</span>
          </div>

          <div className="incident-timeline">

            <div className="incident-timeline-item">
              <div className="incident-timeline-marker marker-danger">
                !
              </div>

              <div className="incident-timeline-content">
                <strong>Incident detected</strong>

                <p>
                  The first API health check failure was recorded.
                </p>

                <span>{formatDate(incident.startedAt)}</span>
              </div>
            </div>

            {incident.failureCount > 1 && (
              <div className="incident-timeline-item">
                <div className="incident-timeline-marker marker-warning">
                  ↻
                </div>

                <div className="incident-timeline-content">
                  <strong>Subsequent failures recorded</strong>

                  <p>
                    {incident.failureCount - 1} additional failed
                    check(s) were recorded.
                  </p>

                  <span>
                    Latest failure: {formatDate(incident.lastFailureAt)}
                  </span>
                </div>
              </div>
            )}

            {isOpen ? (
              <div className="incident-timeline-item">
                <div className="incident-timeline-marker marker-warning">
                  !
                </div>

                <div className="incident-timeline-content">
                  <strong>Incident ongoing</strong>

                  <p>
                    Waiting for the API to recover.
                  </p>

                  <span>Currently open</span>
                </div>
              </div>
            ) : (
              <div className="incident-timeline-item">
                <div className="incident-timeline-marker marker-success">
                  ✓
                </div>

                <div className="incident-timeline-content">
                  <strong>Incident resolved</strong>

                  <p>
                    The API successfully passed a subsequent health check.
                  </p>

                  <span>{formatDate(incident.resolvedAt)}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* DOWNTIME INFORMATION */}

        <div className="incident-detail-panel">

          <div className="incident-panel-heading">
            <h3>Downtime Analysis</h3>
            <span>RELIABILITY</span>
          </div>

          <div className="incident-downtime-box">

            <div>
              <span>Incident Start</span>
              <strong>{formatDate(incident.startedAt)}</strong>
            </div>

            <div>
              <span>Incident Recovery</span>
              <strong>
                {formatDate(incident.resolvedAt)}
              </strong>
            </div>

            <div>
              <span>Total Downtime</span>
              <strong className="incident-downtime-value">
                {formatDuration(getCurrentDuration(incident))}
              </strong>
            </div>

          </div>
        </div>

      </div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="incidents-page">

      {selectedIncident ? (
        renderIncidentDetails()
      ) : (
        <>

          {/* PAGE HEADER */}

          <div className="incidents-heading">
            <div>
              <span className="incidents-eyebrow">
                SYSTEM RELIABILITY
              </span>

              <h2>Incident Management</h2>

              <p>
                Track API failures, investigate downtime and monitor recovery.
              </p>
            </div>

            <button
              className="incident-refresh-btn"
              onClick={fetchIncidents}
              disabled={loading}
              type="button"
            >
              ↻ Refresh
            </button>
          </div>

          {/* ERROR */}

          {error && (
            <div className="incident-error">
              {error}
            </div>
          )}

          {/* SUMMARY CARDS */}

          <div className="incident-stats-grid">

            <div className="incident-stat-card">
              <div className="incident-stat-icon blue">Σ</div>

              <div>
                <span>Total Incidents</span>
                <h3>{incidents.length}</h3>
              </div>
            </div>

            <div className="incident-stat-card">
              <div className="incident-stat-icon red">!</div>

              <div>
                <span>Open Incidents</span>
                <h3>{openCount}</h3>
              </div>
            </div>

            <div className="incident-stat-card">
              <div className="incident-stat-icon green">✓</div>

              <div>
                <span>Resolved Incidents</span>
                <h3>{resolvedCount}</h3>
              </div>
            </div>

          </div>

          {/* INCIDENT TABLE */}

          <div className="incident-table-card">

            <div className="incident-table-header">
              <div>
                <h3>Incident History</h3>
                <p>All detected API failures and recoveries</p>
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="ALL">All Incidents</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>API Monitor</th>
                    <th>Status</th>
                    <th>Failure Reason</th>
                    <th>HTTP Code</th>
                    <th>Failures</th>
                    <th>Started At</th>
                    <th>Downtime</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="table-message">
                        Loading incidents...
                      </td>
                    </tr>
                  ) : filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="incident-empty">
                          <div className="incident-empty-icon">✓</div>

                          <h3>No incidents found</h3>

                          <p>
                            {filter === "ALL"
                              ? "Your APIs have no recorded incidents yet."
                              : `There are no ${filter.toLowerCase()} incidents.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((incident) => (
                      <tr
                        key={incident._id}
                        className="incident-clickable-row"
                        onClick={() => setSelectedIncident(incident)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View incident for ${incident.monitorId?.name || "API monitor"}`}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            setSelectedIncident(incident);
                          }
                        }}
                      >

                        <td>
                          <div className="incident-monitor-cell">
                            <strong>
                              {incident.monitorId?.name || "Deleted Monitor"}
                            </strong>

                            <span>
                              {incident.monitorId?.url || "Monitor unavailable"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`incident-status ${
                              incident.status === "OPEN"
                                ? "incident-open"
                                : "incident-resolved"
                            }`}
                          >
                            {incident.status}
                          </span>
                        </td>

                        <td className="incident-reason">
                          {incident.lastError || "Unknown failure"}
                        </td>

                        <td>
                          {incident.lastStatusCode ?? "—"}
                        </td>

                        <td>{incident.failureCount}</td>

                        <td>{formatDate(incident.startedAt)}</td>

                        <td className="incident-duration">
                          {formatDuration(getCurrentDuration(incident))}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="incident-table-footer">
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default Incidents;
