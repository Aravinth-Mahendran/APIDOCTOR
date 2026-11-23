
import { useMemo, useState } from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const BUCKET_SIZES = {
  "1h": 5 * 60 * 1000,
  "24h": 60 * 60 * 1000,
  "7d": 6 * 60 * 60 * 1000,
  "30d": 24 * 60 * 60 * 1000
};

const formatLabel = (timestamp, range) => {
  const date = new Date(timestamp);

  if (range === "1h" || range === "24h") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short"
  });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="api-chart-tooltip">
      <p className="tooltip-date">{label}</p>

      {payload.map((item) => (
        <div className="tooltip-row" key={item.dataKey}>
          <span
            className="tooltip-dot"
            style={{ background: item.color }}
          />

          <span>{item.name}</span>
          <strong>{item.value} checks</strong>
        </div>
      ))}
    </div>
  );
};

function PerformanceTrendChart({
  
  monitors = [],
  range = "24h",
  loading = false
}) {
    const [selectedMonitorId, setSelectedMonitorId] = useState("all");

    const filteredMonitors =
    selectedMonitorId === "all"
    ? monitors
    : monitors.filter(
        (monitor) => monitor._id === selectedMonitorId
      );
    const chartData = useMemo(() => {
    const bucketSize = BUCKET_SIZES[range] || BUCKET_SIZES["24h"];
    const cutoff = Date.now() - (
      {
        "1h": 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000
      }[range] || 24 * 60 * 60 * 1000
    );

    const buckets = new Map();

    filteredMonitors.forEach((monitor) => {
      (monitor.history || []).forEach((record) => {
        const timestamp = new Date(record.checkedAt).getTime();

        if (!Number.isFinite(timestamp) || timestamp < cutoff) {
          return;
        }

        const performance = record.performanceStatus;

        if (
          !["HEALTHY", "SLOW", "CRITICAL"].includes(performance)
        ) {
          return;
        }

        const bucketTime =
          Math.floor(timestamp / bucketSize) * bucketSize;

        if (!buckets.has(bucketTime)) {
          buckets.set(bucketTime, {
            timestamp: bucketTime,
            healthy: 0,
            slow: 0,
            critical: 0
          });
        }

        const bucket = buckets.get(bucketTime);

        if (performance === "HEALTHY") bucket.healthy += 1;
        if (performance === "SLOW") bucket.slow += 1;
        if (performance === "CRITICAL") bucket.critical += 1;
      });
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => ({
        ...item,
        time: formatLabel(item.timestamp, range)
      }));
  }, [filteredMonitors, range]);

  const hasData = chartData.length > 0;
  // ==========================================
// PERFORMANCE SUMMARY
// ==========================================

const performanceSummary = chartData.reduce(
  (totals, item) => ({
    healthy: totals.healthy + item.healthy,
    slow: totals.slow + item.slow,
    critical: totals.critical + item.critical
  }),
  {
    healthy: 0,
    slow: 0,
    critical: 0
  }
);

const totalChecks =
  performanceSummary.healthy +
  performanceSummary.slow +
  performanceSummary.critical;

  return (
    <div className="chart-card performance-trend-card">
      <div className="card-header performance-trend-header">
  <div>
    <h3>Performance Trend</h3>
    <p>Historical API performance classifications</p>
  </div>
  {/* PERFORMANCE SUMMARY CARDS */}

<div className="performance-summary-grid">

  <div className="performance-summary-card healthy-summary">
    <div className="summary-card-top">
      <span>Healthy Checks</span>
      <span className="summary-icon">✓</span>
    </div>

    <strong>{performanceSummary.healthy}</strong>

    <small>
      {totalChecks > 0
        ? `${((performanceSummary.healthy / totalChecks) * 100).toFixed(1)}% of checks`
        : "No checks recorded"}
    </small>
  </div>

  <div className="performance-summary-card slow-summary">
    <div className="summary-card-top">
      <span>Slow Checks</span>
      <span className="summary-icon">◷</span>
    </div>

    <strong>{performanceSummary.slow}</strong>

    <small>
      {totalChecks > 0
        ? `${((performanceSummary.slow / totalChecks) * 100).toFixed(1)}% of checks`
        : "No checks recorded"}
    </small>
  </div>

  <div className="performance-summary-card critical-summary">
    <div className="summary-card-top">
      <span>Critical Checks</span>
      <span className="summary-icon">!</span>
    </div>

    <strong>{performanceSummary.critical}</strong>

    <small>
      {totalChecks > 0
        ? `${((performanceSummary.critical / totalChecks) * 100).toFixed(1)}% of checks`
        : "No checks recorded"}
    </small>
  </div>

</div>

  <div className="performance-chart-controls">
    <select
      className="performance-monitor-select"
      value={selectedMonitorId}
      onChange={(event) =>
        setSelectedMonitorId(event.target.value)
      }
    >
      <option value="all">All Monitors</option>

      {monitors.map((monitor) => (
        <option key={monitor._id} value={monitor._id}>
          {monitor.name}
        </option>
      ))}
    </select>

    <span className="chart-unit">
      {range === "1h"
        ? "Last hour"
        : range === "24h"
        ? "Last 24 hours"
        : range === "7d"
        ? "Last 7 days"
        : "Last 30 days"}
    </span>
  </div>
</div>

        

      {loading ? (
        <div className="empty-chart">
          <p>Loading performance history...</p>
        </div>
      ) : !hasData ? (
        <div className="empty-chart">
          <div className="empty-chart-icon">▥</div>
          <p>No performance history available.</p>
          <span>
            Wait for monitoring checks to generate performance records.
          </span>
        </div>
      ) : (
        <div className="performance-trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                stroke="#26364d"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                stroke="#8998ae"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={25}
              />

              <YAxis
                allowDecimals={false}
                stroke="#8998ae"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />

              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="healthy"
                name="Healthy"
                stroke="#22c58b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              <Line
                type="monotone"
                dataKey="slow"
                name="Slow"
                stroke="#f5b942"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              <Line
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="#f05c70"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="performance-trend-legend">
        <span><i className="legend-healthy" /> Healthy</span>
        <span><i className="legend-slow" /> Slow</span>
        <span><i className="legend-critical" /> Critical</span>
      </div>
    </div>
  );
}

export default PerformanceTrendChart;
