import { useCallback, useEffect, useMemo, useState } from "react";

import API from "./api/axios";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import StatCard from "./components/StatCard";
import DashboardCharts from "./components/DashboardCharts";
import ResponseTimeChart from "./components/ResponseTimeChart";
import UptimeChart from "./components/UptimeChart";
import StatusDistribution from "./components/StatusDistribution";
import LoadingSkeleton from "./components/LoadingSkeleton";
import Incidents from "./components/incidents";
import Notifications from "./components/notifications";
import PerformanceTrendChart from "./components/PerformanceTrendChart";

const initialForm = {
  name: "",
  url: "",
  method: "GET",
  interval: 1,
  responseTimeWarningMs: 1000,
  responseTimeCriticalMs: 3000
};

function App() {
  // ==========================================
  // STATE
  // ==========================================

  const [monitors, setMonitors] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [activeNav, setActiveNav] = useState("Dashboard");
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  // ==========================================
  // CUSTOM NOTIFICATIONS
  // ==========================================

  const [toast, setToast] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [monitorToDelete, setMonitorToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  // ==========================================
  // ANALYTICS STATE
  // ==========================================

  const [analyticsRange, setAnalyticsRange] = useState("24h");
  const [analyticsHistory, setAnalyticsHistory] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);

  // ==========================================
  // FETCH MONITORS, STATISTICS AND HISTORY
  // ==========================================

  const fetchMonitors = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
  

    try {
      const response = await API.get("/monitors");
      const monitorList = response.data.data || [];

      setBackendConnected(true);
      setError("");

      const enrichedMonitors = await Promise.all(
        monitorList.map(async (monitor) => {
          try {
            const [statsResponse, historyResponse] =
              await Promise.all([
                API.get(`/monitors/${monitor._id}/stats`),
                API.get(`/monitors/${monitor._id}/history`)
              ]);

            const history = historyResponse.data.data || [];
            const stats = statsResponse.data.statistics || {};
            const latest = history[0] || null;

            return {
              ...monitor,
              status: latest?.status || "PENDING",
              performanceStatus:
                latest?.performanceStatus || "UNKNOWN",
              responseTime: latest?.responseTime ?? 0,
              statusCode: latest?.statusCode ?? null,
              lastChecked: latest?.checkedAt ?? null,
              totalChecks: stats.totalChecks || 0,
              successfulChecks: stats.successfulChecks || 0,
              failedChecks: stats.failedChecks || 0,
              uptime: stats.uptimePercentage || 0,
              averageResponseTime: stats.averageResponseTime || 0,
              fastestResponse: stats.fastestResponse || 0,
              slowestResponse: stats.slowestResponse || 0,
              history
            };

          } catch (err) {
            console.error("Monitor details error:", err.message);

            return {
              ...monitor,
              status: "PENDING",
              performanceStatus: "HEALTHY",
              responseTime: 0,
              statusCode: null,
              lastChecked: null,
              totalChecks: 0,
              successfulChecks: 0,
              failedChecks: 0,
              uptime: 0,
              averageResponseTime: 0,
              fastestResponse: 0,
              slowestResponse: 0,
              history: []
            };
          }
        })
      );

      setMonitors(enrichedMonitors);

      setSelectedMonitor((current) => {
        if (!current) return null;

        return (
          enrichedMonitors.find(
            (item) => item._id === current._id
          ) || null
        );
      });

    } catch (err) {
      console.error("Fetch error:", err);
      setBackendConnected(false);

      setError(
        err.response?.data?.message ||
        "Unable to connect to APIDOCTOR backend."
      );

    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  // ==========================================
  // FETCH ANALYTICS HISTORY
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const fetchAnalyticsHistory = async () => {
      if (monitors.length === 0) {
        setAnalyticsHistory({});
        setAnalyticsLoading(false);
        return;
      }

      setAnalyticsLoading(true);

      try {
        const results = await Promise.all(
          monitors.map(async (monitor) => {
            try {
              const response = await API.get(
                `/monitors/${monitor._id}/history?range=${analyticsRange}`
              );

              return {
                monitorId: monitor._id,
                history: response.data.data || []
              };

            } catch (err) {
              console.error(
                `Analytics history error for ${monitor.name}:`,
                err.message
              );

              return {
                monitorId: monitor._id,
                history: []
              };
            }
          })
        );

        if (cancelled) return;

        const historyMap = {};

        results.forEach((result) => {
          historyMap[result.monitorId] = result.history;
        });

        setAnalyticsHistory(historyMap);

      } catch (err) {
        console.error("Analytics fetch error:", err);

        if (!cancelled) {
          setAnalyticsHistory({});
        }

      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };

    fetchAnalyticsHistory();

    return () => {
      cancelled = true;
    };

  }, [monitors, analyticsRange]);

  // ==========================================
  // PREPARE ANALYTICS MONITORS
  // ==========================================

  const analyticsMonitors = useMemo(() => {
    return monitors.map((monitor) => ({
      ...monitor,
      history: analyticsHistory[monitor._id] || []
    }));
  }, [monitors, analyticsHistory]);

  // ==========================================
  // HANDLE ANALYTICS RANGE CHANGE
  // ==========================================

  const handleAnalyticsRangeChange = useCallback((range) => {
    setAnalyticsRange(range);
  }, []);

  // ==========================================
  // AUTOMATIC REFRESH
  // ==========================================

  const fetchIncidents = useCallback(async () => {
  try {
    const response = await API.get("/incidents");

    setIncidents(response.data.incidents || []);
  } catch (err) {
    console.error("Incident fetch error:", err.message);
  }
}, []);
useEffect(() => {
  fetchMonitors(true);
  fetchIncidents();

  const timer = setInterval(() => {
    setRefreshCountdown((current) => {
      if (current <= 1) {
        fetchMonitors(false);
        fetchIncidents();
        return 30;
      }

      return current - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [fetchMonitors, fetchIncidents]);

  // ==========================================
  // MANUAL REFRESH
  // ==========================================

  const refreshNow = useCallback(async () => {
    setRefreshCountdown(30);
    await fetchMonitors(true);
  }, [fetchMonitors]);

  // ==========================================
  // NAVIGATION
  // ==========================================

  const navigate = (page) => {
    setActiveNav(page);
    setSelectedMonitor(null);
    setSearch("");
    setFilter("ALL");
  };

  const openDetails = (monitor) => {
    setSelectedMonitor(monitor);
    setActiveNav("Details");
  };

  const goBackToMonitors = () => {
    setActiveNav("Monitors");
    setSelectedMonitor(null);
  };

  // ==========================================
  // ADD / EDIT MODAL
  // ==========================================

  const openAddModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (monitor) => {
    setEditingId(monitor._id);

    setForm({
      name: monitor.name,
      url: monitor.url,
      method: monitor.method || "GET",
      interval: monitor.interval || 1,
      responseTimeWarningMs:
        monitor.responseTimeWarningMs ?? 1000,
      responseTimeCriticalMs:
        monitor.responseTimeCriticalMs ?? 3000
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        [
          "interval",
          "responseTimeWarningMs",
          "responseTimeCriticalMs"
        ].includes(name)
          ? Number(value)
          : value
    }));
  };

  // ==========================================
  // CREATE / UPDATE MONITOR
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const wasEditing = Boolean(editingId);

    const warning = Number(form.responseTimeWarningMs);
    const critical = Number(form.responseTimeCriticalMs);

    if (
      !Number.isInteger(warning) ||
      warning < 100 ||
      warning > 60000
    ) {
      setError(
        "Warning threshold must be an integer between 100 and 60000 ms."
      );
      return;
    }

    if (
      !Number.isInteger(critical) ||
      critical < 200 ||
      critical > 120000
    ) {
      setError(
        "Critical threshold must be an integer between 200 and 120000 ms."
      );
      return;
    }

    if (critical <= warning) {
      setError(
        "Critical threshold must be greater than warning threshold."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        method: form.method,
        interval: Number(form.interval),
        responseTimeWarningMs: warning,
        responseTimeCriticalMs: critical
      };

      if (wasEditing) {
        await API.put(`/monitors/${editingId}`, payload);
      } else {
        await API.post("/monitors", payload);
      }

      closeModal();

      await fetchMonitors(false);

      setToast({
        type: "success",
        message: wasEditing
          ? "Monitor updated successfully!"
          : "Monitor created successfully!"
      });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save monitor."
      );

    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE MONITOR - OPEN CONFIRMATION
  // ==========================================

  const requestDelete = (monitor) => {
    setMonitorToDelete(monitor);
    setShowDeleteConfirm(true);
  };

  // ==========================================
  // DELETE MONITOR - CANCEL
  // ==========================================

  const cancelDelete = () => {
    if (deleting) return;

    setShowDeleteConfirm(false);
    setMonitorToDelete(null);
  };

  // ==========================================
  // DELETE MONITOR - CONFIRM
  // ==========================================

  const confirmDelete = async () => {
    if (!monitorToDelete || deleting) return;

    const id = monitorToDelete._id;

    try {
      setDeleting(true);
      setError("");

      await API.delete(`/monitors/${id}`);

      setMonitors((previous) =>
        previous.filter((item) => item._id !== id)
      );

      setAnalyticsHistory((previous) => {
        const updated = { ...previous };
        delete updated[id];
        return updated;
      });

      if (selectedMonitor?._id === id) {
        setSelectedMonitor(null);
        setActiveNav("Monitors");
      }

      setShowDeleteConfirm(false);
      setMonitorToDelete(null);

      setToast({
        type: "success",
        message: "Monitor deleted successfully!"
      });

    } catch (err) {
      setShowDeleteConfirm(false);
      setMonitorToDelete(null);

      setError(
        err.response?.data?.message ||
        "Unable to delete monitor."
      );

    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  const filteredMonitors = useMemo(() => {
    return monitors.filter((monitor) => {
      const matchesSearch =
        monitor.name.toLowerCase().includes(search.toLowerCase()) ||
        monitor.url.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" || monitor.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [monitors, search, filter]);

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const totalMonitors = monitors.length;

  const upMonitors = monitors.filter(
    (item) => item.status === "UP"
  ).length;

  const downMonitors = monitors.filter(
    (item) => item.status === "DOWN"
  ).length;

  const averageUptime = totalMonitors
    ? (
        monitors.reduce(
          (sum, item) => sum + item.uptime,
          0
        ) / totalMonitors
      ).toFixed(2)
    : "0.00";
    // ==========================================
// PERFORMANCE STATISTICS
// ==========================================

const healthyMonitors = monitors.filter(
  (monitor) => monitor.performanceStatus === "HEALTHY"
).length;

const slowMonitors = monitors.filter(
  (monitor) => monitor.performanceStatus === "SLOW"
).length;

const criticalMonitors = monitors.filter(
  (monitor) => monitor.performanceStatus === "CRITICAL"
).length;

const monitoredWithResponse = monitors.filter(
  (monitor) => monitor.totalChecks > 0
);

const averageResponseTime = monitoredWithResponse.length
  ? Math.round(
      monitoredWithResponse.reduce(
        (sum, monitor) => sum + Number(monitor.averageResponseTime || 0),
        0
      ) / monitoredWithResponse.length
    )
  : 0;
  

  // ==========================================
  // HELPERS
  // ==========================================

  const getStatusClass = (status) => {
    if (status === "UP") return "status-up";
    if (status === "DOWN") return "status-down";
    return "status-pending";
  };

  const getPerformanceClass = (status) => {
    if (status === "HEALTHY") return "performance-healthy";
    if (status === "SLOW") return "performance-slow";
    if (status === "CRITICAL") return "performance-critical";
    return "performance-unknown";
  };

  const formatDate = (date) => {
    if (!date) return "Not checked yet";

    return new Date(date).toLocaleString();
  };

  const formatRelativeTime = (date) => {
    if (!date) return "Never checked";

    const checkedAt = new Date(date).getTime();

    if (Number.isNaN(checkedAt)) {
      return "Unknown";
    }

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - checkedAt) / 1000)
    );

    if (seconds < 5) return "Just now";
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);

    if (hours === 1) return "1 hour ago";

    return `${hours} hours ago`;
  };

  const getUptimeLabel = (monitor) => {
    return monitor.totalChecks
      ? `${monitor.uptime}%`
      : "No data yet";
  };

  // PART 2 CONTINUES HERE
    // ==========================================
  // MONITOR TABLE
  // ==========================================

  const renderMonitorTable = (items, title, subtitle) => (
    <div className="monitor-table-card">

      <div className="table-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <button
          className="add-monitor-btn"
          onClick={openAddModal}
          type="button"
        >
          + Add Monitor
        </button>
      </div>

      <div className="table-controls">
        <input
          type="text"
          placeholder="Search monitors..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="UP">UP</option>
          <option value="DOWN">DOWN</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Monitor</th>
              <th>Method</th>
              <th>Status</th>
              <th>Performance</th>
              <th>Response Time</th>
              <th>Uptime</th>
              <th>Last Checked</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="table-message">
                  Loading monitors...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-message">
                  No monitors found.
                </td>
              </tr>
            ) : (
              items.map((monitor) => (
                <tr key={monitor._id}>
                  <td>
                    <div className="monitor-name-cell">
                      <strong
                        className="clickable-monitor"
                        onClick={() => openDetails(monitor)}
                      >
                        {monitor.name}
                      </strong>

                      <span>{monitor.url}</span>
                    </div>
                  </td>

                  <td>
                    <span className="method-badge">
                      {monitor.method}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${getStatusClass(
                        monitor.status
                      )}`}
                    >
                      {monitor.status}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`performance-badge ${getPerformanceClass(
                        monitor.performanceStatus
                      )}`}
                    >
                      {monitor.performanceStatus || "UNKNOWN"}
                    </span>
                  </td>

                  <td>{monitor.responseTime} ms</td>

                  <td>{getUptimeLabel(monitor)}</td>

                  <td>{formatDate(monitor.lastChecked)}</td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(monitor)}
                        type="button"
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => requestDelete(monitor)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Showing {items.length} of {monitors.length} monitors
      </div>
    </div>
  );

  // ==========================================
  // DASHBOARD STATISTICS CARDS
  // ==========================================

  const renderDashboardStats = () => (
  <>
    <div className="stats-grid">
      <StatCard
        title="Total Monitors"
        value={totalMonitors}
        description="Registered APIs"
        icon="◉"
        color="blue"
      />

      <StatCard
        title="Operational"
        value={upMonitors}
        description="Currently UP"
        icon="↗"
        color="green"
      />

      <StatCard
        title="Downtime"
        value={downMonitors}
        description="Currently DOWN"
        icon="!"
        color="red"
      />

      <StatCard
        title="Average Uptime"
        value={`${averageUptime}%`}
        description="Based on recorded checks"
        icon="%"
        color="purple"
      />
    </div>

    <div className="stats-grid performance-stats-grid">
      <StatCard
        title="Healthy APIs"
        value={healthyMonitors}
        description="Normal response speed"
        icon="✓"
        color="green"
      />

      <StatCard
        title="Slow APIs"
        value={slowMonitors}
        description="Above warning threshold"
        icon="◷"
        color="blue"
      />

      <StatCard
        title="Critical APIs"
        value={criticalMonitors}
        description="Above critical threshold"
        icon="!"
        color="red"
      />

      <StatCard
        title="Avg Response Time"
        value={`${averageResponseTime} ms`}
        description="Across monitored APIs"
        icon="⚡"
        color="purple"
      />
    </div>
  </>
);

  // ==========================================
  // MONITOR DETAILS PAGE
  // ==========================================

  const renderDetails = () => {
    if (!selectedMonitor) {
      return (
        <div className="details-panel">
          <h3>Monitor not selected</h3>

          <p>
            Please select a monitor from the Monitors page.
          </p>

          <button
            className="add-monitor-btn"
            onClick={goBackToMonitors}
            type="button"
          >
            Back to Monitors
          </button>
        </div>
      );
    }

    const monitor = selectedMonitor;
    const history = monitor.history || [];

    const failures = history.filter(
      (record) => record.status === "DOWN"
    );

    return (
      <div className="details-section">

        {/* DETAILS HEADER */}

        <div className="details-heading">
          <div>
            <h2>{monitor.name}</h2>
            <p>{monitor.url}</p>
          </div>

          <span
            className={`status-badge ${getStatusClass(
              monitor.status
            )}`}
          >
            {monitor.status}
          </span>
        </div>

        {/* MONITOR INFORMATION */}

        <div className="details-panel">
          <h3>Monitor Information</h3>

          <div className="details-metadata">

            <div className="metadata-item">
              <span>API URL</span>
              <strong>{monitor.url}</strong>
            </div>

            <div className="metadata-item">
              <span>HTTP Method</span>
              <strong>{monitor.method}</strong>
            </div>

            <div className="metadata-item">
              <span>Monitoring Interval</span>
              <strong>{monitor.interval} minute(s)</strong>
            </div>

            <div className="metadata-item">
              <span>Last Checked</span>
              <strong>{formatDate(monitor.lastChecked)}</strong>
            </div>

            <div className="metadata-item">
              <span>Latest HTTP Status Code</span>
              <strong>{monitor.statusCode ?? "—"}</strong>
            </div>

            <div className="metadata-item">
              <span>Created At</span>
              <strong>{formatDate(monitor.createdAt)}</strong>
            </div>

            <div className="metadata-item">
              <span>Performance Status</span>
              <strong>
                <span
                  className={`performance-badge ${getPerformanceClass(
                    monitor.performanceStatus
                  )}`}
                >
                  {monitor.performanceStatus || "UNKNOWN"}
                </span>
              </strong>
            </div>

            <div className="metadata-item">
              <span>Warning Threshold</span>
              <strong>
                {monitor.responseTimeWarningMs ?? 1000} ms
              </strong>
            </div>

            <div className="metadata-item">
              <span>Critical Threshold</span>
              <strong>
                {monitor.responseTimeCriticalMs ?? 3000} ms
              </strong>
            </div>

          </div>
        </div>

        {/* PERFORMANCE CARDS */}

        <div className="stats-grid">

          <StatCard
            title="Uptime"
            value={`${monitor.uptime}%`}
            description="Based on recorded checks"
            icon="%"
            color="green"
          />

          <StatCard
            title="Average Response"
            value={`${monitor.averageResponseTime} ms`}
            description="Successful checks"
            icon="◷"
            color="blue"
          />

          <StatCard
            title="Successful Checks"
            value={monitor.successfulChecks}
            description="API available"
            icon="✓"
            color="green"
          />

          <StatCard
            title="Failed Checks"
            value={monitor.failedChecks}
            description="API unavailable"
            icon="!"
            color="red"
          />

        </div>

        {/* INDIVIDUAL API CHARTS */}

        <ResponseTimeChart
          history={history}
          title="Response Time History"
          subtitle={monitor.name}
        />

        <div className="details-chart-grid">
          <UptimeChart history={history} />
          <StatusDistribution history={history} />
        </div>

        {/* RESPONSE STATISTICS */}

        <div className="stats-grid">

          <StatCard
            title="Total Checks"
            value={monitor.totalChecks}
            description="Recorded checks"
            icon="◉"
            color="blue"
          />

          <StatCard
            title="Fastest Response"
            value={`${monitor.fastestResponse} ms`}
            description="Best successful response"
            icon="↗"
            color="green"
          />

          <StatCard
            title="Slowest Response"
            value={`${monitor.slowestResponse} ms`}
            description="Slowest successful response"
            icon="↘"
            color="red"
          />

          <StatCard
            title="Latest Response"
            value={`${monitor.responseTime} ms`}
            description="Most recent check"
            icon="◷"
            color="blue"
          />

        </div>

        {/* MONITORING HISTORY */}

        <div className="details-panel">

          <div className="table-header">
            <div>
              <h3>Monitoring History</h3>
              <p>Latest recorded API health checks</p>
            </div>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Performance</th>
                  <th>HTTP Code</th>
                  <th>Response Time</th>
                  <th>Checked At</th>
                  <th>Error</th>
                </tr>
              </thead>

              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-message">
                      No history available yet.
                    </td>
                  </tr>
                ) : (
                  history.map((record, index) => (
                    <tr key={record._id || index}>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`performance-badge ${getPerformanceClass(
                            record.performanceStatus
                          )}`}
                        >
                          {record.performanceStatus || "UNKNOWN"}
                        </span>
                      </td>

                      <td>{record.statusCode ?? "—"}</td>

                      <td>{record.responseTime} ms</td>

                      <td>{formatDate(record.checkedAt)}</td>

                      <td className="error-cell">
                        {record.error || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            Showing {history.length} latest records (maximum 100)
          </div>
        </div>

        {/* FAILURE LOGS */}

        <div className="details-panel">
          <h3>Failure and Timeout Logs</h3>

          {failures.length === 0 ? (
            <div className="no-failures">
              <span>✓</span>
              <p>
                No failures recorded in the available history.
              </p>
            </div>
          ) : (
            failures.map((record, index) => (
              <div
                className="event-row"
                key={record._id || index}
              >
                <div>
                  <strong>
                    {record.error || "API check failed"}
                  </strong>

                  <p>{formatDate(record.checkedAt)}</p>
                </div>

                <span className="status-badge status-down">
                  DOWN
                </span>
              </div>
            ))
          )}
        </div>

        {/* DETAILS ACTIONS */}

        <div className="details-actions">
          <button
            className="refresh-btn"
            onClick={refreshNow}
            disabled={loading}
            type="button"
          >
            ↻ Refresh Details
          </button>

          <button
            className="add-monitor-btn"
            onClick={() => openEditModal(monitor)}
            type="button"
          >
            Edit Monitor
          </button>
        </div>

      </div>
    );
  };
    // ==========================================
  // MAIN APPLICATION UI
  // ==========================================

  return (
    <div className="app-container">

      {/* SIDEBAR */}

      <Sidebar
        activeNav={
          activeNav === "Details" ? "Monitors" : activeNav
        }
        onNavigate={navigate}
        backendConnected={backendConnected}
      />

      <main className="main-content">

        {/* NAVBAR */}

        <Navbar
          title={
            activeNav === "Details"
              ? "Monitor Details"
              : activeNav
          }
          subtitle={
            activeNav === "Dashboard"
              ? "Monitor your APIs in real time"
              : activeNav === "Monitors"
              ? "Manage all your API endpoints"
              : activeNav === "Incidents"
              ? "Investigate failures and track API recovery"
              : activeNav === "Notifications"
              ? "Track incident alerts and email delivery history"
              : "API performance and monitoring history"
          }
          onRefresh={refreshNow}
          onAddMonitor={openAddModal}
          onBack={goBackToMonitors}
          showBackButton={activeNav === "Details"}
          showAddButton={
            activeNav === "Dashboard" || activeNav === "Monitors"
          }
          loading={loading}
        />

        {/* REFRESH COUNTDOWN */}

        <div className="refresh-meta">

          <span className="refresh-meta-item">
            <span className="refresh-live-dot" />

            Auto-refresh{" "}

            <strong>
              {`00:${String(refreshCountdown).padStart(2, "0")}`}
            </strong>
          </span>

          <span className="refresh-meta-divider" />

          <span className="refresh-meta-item">
            Last check:{" "}

            <strong>
              {monitors.length
                ? formatRelativeTime(
                    monitors.reduce((latest, monitor) => {
                      if (!monitor.lastChecked) return latest;

                      if (!latest) return monitor.lastChecked;

                      return new Date(monitor.lastChecked) >
                        new Date(latest)
                        ? monitor.lastChecked
                        : latest;
                    }, null)
                  )
                : "No checks yet"}
            </strong>
          </span>

          <button
            className="refresh-meta-button"
            onClick={refreshNow}
            disabled={loading}
            type="button"
          >
            Refresh now
          </button>

        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="error-banner">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* PAGE CONTENT */}

        <section className="dashboard">

          {/* LOADING STATE */}

          {loading &&
          monitors.length === 0 &&
          activeNav !== "Incidents" &&
          activeNav !== "Notifications" ? (
            <>
              <LoadingSkeleton type="stats" count={4} />
              <LoadingSkeleton type="chart" />
            </>
          ) : (
            <>

              {/* DASHBOARD PAGE */}

              {activeNav === "Dashboard" && (
                <>
                  {renderDashboardStats()}

                  <DashboardCharts
                    monitors={analyticsMonitors}
                    incidents={incidents}
                    range={analyticsRange}
                    onRangeChange={handleAnalyticsRangeChange}
                    loading={analyticsLoading}
                  />
                  <PerformanceTrendChart
                    monitors={analyticsMonitors}
                    range={analyticsRange}
                    loading={analyticsLoading}
                  />

                  {renderMonitorTable(
                    filteredMonitors.slice(0, 5),
                    "Recent Monitors",
                    "Overview of your registered APIs"
                  )}
                </>
              )}

              {/* MONITORS PAGE */}

              {activeNav === "Monitors" && (
                <>
                  {renderDashboardStats()}

                  {renderMonitorTable(
                    filteredMonitors,
                    "All Monitors",
                    "Manage and monitor all your registered APIs"
                  )}
                </>
              )}

              {/* INCIDENTS PAGE */}

              {activeNav === "Incidents" && (
                <Incidents />
              )}

              {/* NOTIFICATIONS PAGE */}

              {activeNav === "Notifications" && (
                <Notifications />
              )}

              {/* DETAILS PAGE */}

              {activeNav === "Details" && renderDetails()}

            </>
          )}

        </section>
      </main>

      {/* ======================================
          ADD / EDIT MONITOR MODAL
      ====================================== */}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>
                  {editingId
                    ? "Edit Monitor"
                    : "Add New Monitor"}
                </h2>

                <p>
                  Configure the API endpoint you want to monitor.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Monitor Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Example: GitHub API"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>API URL</label>

                <input
                  type="url"
                  name="url"
                  placeholder="https://api.example.com"
                  value={form.url}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>HTTP Method</label>

                  <select
                    name="method"
                    value={form.method}
                    onChange={handleFormChange}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Check Interval</label>

                  <select
                    name="interval"
                    value={form.interval}
                    onChange={handleFormChange}
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

              </div>

              {/* PERFORMANCE THRESHOLDS */}

              <div className="threshold-section">

                <div className="threshold-heading">
                  <h3>Performance Thresholds</h3>

                  <p>
                    Configure when APIDOCTOR should flag slow APIs.
                  </p>
                </div>

                <div className="form-row">

                  <div className="form-group">
                    <label>Warning Threshold (ms)</label>

                    <input
                      type="number"
                      name="responseTimeWarningMs"
                      min="100"
                      max="60000"
                      step="100"
                      value={form.responseTimeWarningMs}
                      onChange={handleFormChange}
                      required
                    />

                    <small>Default: 1000 ms</small>
                  </div>

                  <div className="form-group">
                    <label>Critical Threshold (ms)</label>

                    <input
                      type="number"
                      name="responseTimeCriticalMs"
                      min="200"
                      max="120000"
                      step="100"
                      value={form.responseTimeCriticalMs}
                      onChange={handleFormChange}
                      required
                    />

                    <small>Default: 3000 ms</small>
                  </div>

                </div>

                <p className="threshold-note">
                  Critical threshold must be greater than warning threshold.
                </p>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-monitor-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Monitor"
                    : "Create Monitor"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================
          PREMIUM DELETE CONFIRMATION MODAL
      ====================================== */}

      {showDeleteConfirm && (
        <div
          className="doctor-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              cancelDelete();
            }
          }}
        >
          <div
            className="doctor-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="doctor-warning-icon">
              <span>!</span>
            </div>

            <div className="doctor-confirm-content">

              <span className="doctor-eyebrow">
                CONFIRM DELETION
              </span>

              <h2 id="delete-title">
                Delete this monitor?
              </h2>

              <p>
                You're about to permanently remove this monitor
                and its monitoring history.
              </p>

              {monitorToDelete && (
                <div className="doctor-monitor-preview">

                  <div className="doctor-preview-icon">
                    API
                  </div>

                  <div className="doctor-preview-info">
                    <strong>{monitorToDelete.name}</strong>
                    <span>{monitorToDelete.url}</span>
                  </div>

                </div>
              )}

              <div className="doctor-warning-note">
                <span>⚠</span>
                <p>This action cannot be undone.</p>
              </div>

              <div className="doctor-confirm-actions">

                <button
                  className="doctor-cancel-btn"
                  onClick={cancelDelete}
                  disabled={deleting}
                  type="button"
                >
                  Cancel
                </button>

                <button
                  className="doctor-delete-confirm-btn"
                  onClick={confirmDelete}
                  disabled={deleting}
                  type="button"
                >
                  {deleting ? "Deleting..." : "Delete Monitor"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================
          PREMIUM TOAST NOTIFICATION
      ====================================== */}

      {toast && (
        <div
          className={`doctor-toast ${
            toast.type === "success"
              ? "doctor-toast-success"
              : "doctor-toast-error"
          }`}
          role="status"
          aria-live="polite"
        >

          <div className="doctor-toast-icon">
            {toast.type === "success" ? "✓" : "!"}
          </div>

          <div className="doctor-toast-content">
            <strong>
              {toast.type === "success" ? "Success" : "Error"}
            </strong>

            <p>{toast.message}</p>
          </div>

          <button
            className="doctor-toast-close"
            onClick={() => setToast(null)}
            type="button"
            aria-label="Close notification"
          >
            ×
          </button>

        </div>
      )}

    </div>
  );
}

export default App;