import { useMemo } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// ==========================================
// CHART COLORS
// ==========================================

const COLORS = [
  "#718cff",
  "#22c58b",
  "#f5b942",
  "#a78bfa",
  "#f05c70",
  "#38bdf8",
  "#fb923c"
];

const STATUS_COLORS = {
  UP: "#22c58b",
  DOWN: "#f05c70",
  PENDING: "#f5b942"
};

// ==========================================
// TIME RANGE OPTIONS
// ==========================================

const TIME_RANGES = [
  { label: "1 Hour", value: "1h" },
  { label: "24 Hours", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" }
];

const RANGE_DURATIONS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

const BUCKET_SIZES = {
  "1h": 5 * 60 * 1000,
  "24h": 60 * 60 * 1000,
  "7d": 6 * 60 * 60 * 1000,
  "30d": 24 * 60 * 60 * 1000
};

// ==========================================
// DATE FORMATTING
// ==========================================

const formatBucketLabel = (timestamp, range) => {
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

const formatTooltipDate = (timestamp) => {
  if (!timestamp) return "N/A";

  return new Date(timestamp).toLocaleString();
};

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

// ==========================================
// STANDARD CHART TOOLTIP
// ==========================================

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="api-chart-tooltip">
      <p className="tooltip-date">
        {typeof label === "number"
          ? formatTooltipDate(label)
          : label}
      </p>

      {payload
        .filter(
          (item) =>
            item.value !== null &&
            item.value !== undefined
        )
        .map((item, index) => (
          <div
            className="tooltip-row"
            key={`${item.name}-${index}`}
          >
            <span
              className="tooltip-dot"
              style={{
                background: item.color || item.fill
              }}
            />

            <span>{item.name}</span>

            <strong>
              {item.value}
              {item.unit || ""}
            </strong>
          </div>
        ))}
    </div>
  );
};

// ==========================================
// INCIDENT TOOLTIP
// ==========================================

const IncidentTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const markerItem = payload.find(
    (item) =>
      item.payload?.type === "START" ||
      item.payload?.type === "RECOVERY"
  );

  if (!markerItem) return null;

  const marker = markerItem.payload;
  const isRecovery = marker.type === "RECOVERY";

  return (
    <div className="api-chart-tooltip incident-tooltip">

      <div className="incident-tooltip-heading">
        <span
          className="tooltip-dot"
          style={{
            background: isRecovery
              ? "#22c58b"
              : "#f05c70"
          }}
        />

        <strong>
          {isRecovery
            ? "Incident Recovered"
            : "Incident Started"}
        </strong>
      </div>

      <div className="incident-tooltip-content">

        <p>
          <span>Monitor</span>
          <strong>{marker.monitorName}</strong>
        </p>

        <p>
          <span>Event time</span>
          <strong>
            {formatTooltipDate(marker.timestamp)}
          </strong>
        </p>

        <p>
          <span>Started</span>
          <strong>
            {marker.timestampIsClipped
              ? `Before selected range (${formatTooltipDate(
                  marker.originalStartedAt
                )})`
              : formatTooltipDate(marker.startedAt)}
          </strong>
        </p>

        <p>
          <span>Recovered</span>
          <strong>
            {marker.resolvedAt
              ? formatTooltipDate(marker.resolvedAt)
              : "Still active"}
          </strong>
        </p>

        <p>
          <span>Downtime</span>
          <strong>
            {formatDuration(marker.durationMs)}
          </strong>
        </p>

        <p>
          <span>Failure count</span>
          <strong>{marker.failureCount}</strong>
        </p>

        <p>
          <span>Status</span>
          <strong
            style={{
              color:
                marker.status === "OPEN"
                  ? "#f05c70"
                  : "#22c58b"
            }}
          >
            {marker.status}
          </strong>
        </p>

        <div className="incident-tooltip-error">
          <span>Last error</span>
          <p>{marker.error}</p>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// INCIDENT MARKER SHAPE
// ==========================================

const IncidentMarkerShape = (props) => {
  const { cx, cy, payload } = props;

  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !payload
  ) {
    return null;
  }

  const isRecovery = payload.type === "RECOVERY";

  return (
    <g style={{ cursor: "pointer" }}>
      <circle
        cx={cx}
        cy={cy}
        r={11}
        fill={isRecovery ? "#22c58b" : "#f05c70"}
        opacity={0.16}
      />

      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={isRecovery ? "#22c58b" : "#f05c70"}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
    </g>
  );
};

// ==========================================
// MAIN DASHBOARD CHARTS COMPONENT
// ==========================================

function DashboardCharts({
  monitors = [],
  incidents = [],
  range = "24h",
  onRangeChange,
  loading = false
}) {

  // ==========================================
  // COLLECT ALL MONITORING HISTORY
  // ==========================================

  const allRecords = useMemo(() => {
    return monitors.flatMap((monitor) => {
      return (monitor.history || []).map((record) => ({
        ...record,
        monitorId: monitor._id,
        monitorName: monitor.name
      }));
    });
  }, [monitors]);

  // ==========================================
  // FILTER RECORDS
  // ==========================================

  const filteredRecords = useMemo(() => {
    const selectedDuration =
      RANGE_DURATIONS[range] ||
      RANGE_DURATIONS["24h"];

    const cutoff = Date.now() - selectedDuration;

    return allRecords
      .filter((record) => {
        const checkedAt = new Date(
          record.checkedAt
        ).getTime();

        return (
          Number.isFinite(checkedAt) &&
          checkedAt >= cutoff
        );
      })
      .sort(
        (a, b) =>
          new Date(a.checkedAt).getTime() -
          new Date(b.checkedAt).getTime()
      );
  }, [allRecords, range]);

  // ==========================================
  // RESPONSE TIME PERCENTILES
  // ==========================================

  const percentileStats = useMemo(() => {
    const responseTimes = filteredRecords
      .filter(
        (record) =>
          record.status === "UP" &&
          record.responseTime !== null &&
          record.responseTime !== undefined &&
          Number.isFinite(Number(record.responseTime))
      )
      .map((record) => Number(record.responseTime))
      .sort((a, b) => a - b);

    const calculatePercentile = (percentile) => {
      if (!responseTimes.length) return 0;

      const index = Math.ceil(
        (percentile / 100) * responseTimes.length
      ) - 1;

      return responseTimes[Math.max(0, index)];
    };

    return {
      p50: Math.round(calculatePercentile(50)),
      p95: Math.round(calculatePercentile(95)),
      p99: Math.round(calculatePercentile(99)),
      sampleCount: responseTimes.length
    };
  }, [filteredRecords]);


  // ==========================================
  // PER-MONITOR PERCENTILE ANALYTICS
  // ==========================================

  
const monitorPercentiles = useMemo(() => {
  return monitors
    .map((monitor) => {
      const times = filteredRecords
        .filter(
          (record) =>
            record.monitorId === monitor._id &&
            record.status === "UP" &&
            record.responseTime !== null &&
            record.responseTime !== undefined &&
            Number.isFinite(Number(record.responseTime))
        )
        .map((record) => Number(record.responseTime))
        .sort((a, b) => a - b);

      const calculatePercentile = (percentile) => {
        if (!times.length) return 0;

        const index =
          Math.ceil((percentile / 100) * times.length) - 1;

        return Math.round(times[Math.max(0, index)]);
      };

      const p50 = calculatePercentile(50);
      const p95 = calculatePercentile(95);
      const p99 = calculatePercentile(99);

      const warningThreshold =
        Number(monitor.responseTimeWarningMs) || 1000;

      const criticalThreshold =
        Number(monitor.responseTimeCriticalMs) || 3000;

      let latencyHealth = "UNKNOWN";

      if (times.length > 0) {
        if (p95 >= criticalThreshold) {
          latencyHealth = "CRITICAL";
        } else if (p95 >= warningThreshold) {
          latencyHealth = "DEGRADED";
        } else {
          latencyHealth = "HEALTHY";
        }
      }
            let recommendation = "";
            let recommendationTitle = "";

            if (times.length === 0) {
            recommendationTitle = "Insufficient data";
            recommendation =
                "Wait for successful monitoring checks before evaluating latency.";
            } else if (latencyHealth === "CRITICAL") {
            recommendationTitle = "Investigate critical latency";

            recommendation =
                "P95 has exceeded the critical threshold. Investigate slow endpoint processing, database queries, server load and external dependencies.";
            } else if (latencyHealth === "DEGRADED") {
            recommendationTitle = "Optimize response time";

            recommendation =
                "P95 has exceeded the warning threshold. Review recent response-time spikes and investigate slow requests.";
            } else {
            recommendationTitle = "Performance is healthy";

            recommendation =
                "P95 is within the configured thresholds. Continue monitoring and track changes in P95 and P99.";
            }

            if (
            times.length > 0 &&
            p99 > criticalThreshold &&
            latencyHealth !== "CRITICAL"
            ) {
            recommendationTitle = "Investigate latency spikes";

            recommendation =
                "P99 exceeds the critical threshold even though P95 is within limits. Investigate occasional slow requests and intermittent bottlenecks.";
            }

      return {
        id: monitor._id,
        name: monitor.name,
        p50,
        p95,
        p99,
        samples: times.length,
        warningThreshold,
        criticalThreshold,
        latencyHealth,
        recommendationTitle,
        recommendation
      };
    })
    .sort((a, b) => b.p95 - a.p95);
}, [monitors, filteredRecords]);

// ==========================================
// OVERALL PERFORMANCE INTELLIGENCE
// ==========================================

const overallPerformance = useMemo(() => {
  const analyzed = monitorPercentiles.filter(
    (monitor) => monitor.samples > 0
  );

  const healthy = analyzed.filter(
    (monitor) => monitor.latencyHealth === "HEALTHY"
  ).length;

  const degraded = analyzed.filter(
    (monitor) => monitor.latencyHealth === "DEGRADED"
  ).length;

  const critical = analyzed.filter(
    (monitor) => monitor.latencyHealth === "CRITICAL"
  ).length;

  const unknown = monitors.length - analyzed.length;

  const worstMonitor = [...analyzed].sort(
    (a, b) => b.p95 - a.p95
  )[0] || null;

  // Weighted score:
  // Healthy = 100, Degraded = 60, Critical = 20.
  // Monitors without samples are excluded.

  const score = analyzed.length
    ? Math.round(
        (
          healthy * 100 +
          degraded * 60 +
          critical * 20
        ) / analyzed.length
      )
    : null;

  let scoreLabel = "No Data";

  if (score !== null) {
    if (score >= 85) scoreLabel = "Excellent";
    else if (score >= 70) scoreLabel = "Good";
    else if (score >= 50) scoreLabel = "Needs Attention";
    else scoreLabel = "Poor";
  }

  return {
    total: monitors.length,
    analyzed: analyzed.length,
    healthy,
    degraded,
    critical,
    unknown,
    score,
    scoreLabel,
    worstMonitor
  };
}, [monitorPercentiles, monitors]);



  // ==========================================
  // INCIDENT CORRELATION EVENTS
  // ==========================================

  const incidentMarkers = useMemo(() => {
    const selectedDuration =
      RANGE_DURATIONS[range] ||
      RANGE_DURATIONS["24h"];

    const now = Date.now();
    const cutoff = now - selectedDuration;

    const markers = [];

    incidents.forEach((incident) => {
      const monitor =
        typeof incident.monitorId === "object"
          ? incident.monitorId
          : null;

      const monitorId =
        monitor?._id || incident.monitorId;

      const monitorName =
        monitor?.name ||
        monitors.find(
          (item) => item._id === monitorId
        )?.name ||
        "Unknown monitor";

      const startedAt = new Date(
        incident.startedAt
      ).getTime();

      const resolvedAt = incident.resolvedAt
        ? new Date(incident.resolvedAt).getTime()
        : null;

      if (!Number.isFinite(startedAt)) return;

      const isOpen =
        incident.status === "OPEN" ||
        !Number.isFinite(resolvedAt);

      const durationMs = isOpen
        ? Math.max(0, now - startedAt)
        : Number.isFinite(Number(incident.durationMs))
          ? Number(incident.durationMs)
          : Math.max(0, resolvedAt - startedAt);

      const common = {
        incidentId: incident._id,
        monitorId,
        monitorName,
        startedAt,
        resolvedAt,
        durationMs,
        failureCount: incident.failureCount || 0,
        error: incident.lastError || "No error details",
        status: isOpen ? "OPEN" : "RESOLVED"
      };

      // INCIDENT START MARKER
      // If an incident began before the selected range,
      // show its start at the visible range boundary.

      if (
        startedAt <= now &&
        (isOpen || resolvedAt >= cutoff)
      ) {
        const visibleStart = Math.max(
          startedAt,
          cutoff
        );

        markers.push({
          ...common,
          id: `${incident._id}-start`,
          timestamp: visibleStart,
          originalStartedAt: startedAt,
          timestampIsClipped: startedAt < cutoff,
          type: "START",
          x: visibleStart,
          y: 0.92
        });
      }

      // INCIDENT RECOVERY MARKER

      if (
        !isOpen &&
        Number.isFinite(resolvedAt) &&
        resolvedAt >= cutoff &&
        resolvedAt <= now
      ) {
        markers.push({
          ...common,
          id: `${incident._id}-recovery`,
          timestamp: resolvedAt,
          type: "RECOVERY",
          x: resolvedAt,
          y: 0.92
        });
      }
    });

    // REMOVE DUPLICATE MARKER KEYS

    const uniqueMarkers = Array.from(
      new Map(
        markers.map((marker) => [
          marker.id,
          marker
        ])
      ).values()
    );

    return uniqueMarkers.sort(
      (a, b) => a.timestamp - b.timestamp
    );

  }, [incidents, monitors, range]);

  // ==========================================
  // INCIDENT DURATION BANDS
  // ==========================================

  const incidentBands = useMemo(() => {
    const selectedDuration =
      RANGE_DURATIONS[range] ||
      RANGE_DURATIONS["24h"];

    const now = Date.now();
    const cutoff = now - selectedDuration;

    return incidents
      .map((incident) => {
        const startedAt = new Date(
          incident.startedAt
        ).getTime();

        const resolvedAt = incident.resolvedAt
          ? new Date(incident.resolvedAt).getTime()
          : null;

        if (!Number.isFinite(startedAt)) {
          return null;
        }

        const isOpen =
          incident.status === "OPEN" ||
          !Number.isFinite(resolvedAt);

        const endTime = isOpen
          ? now
          : resolvedAt;

        if (
          startedAt > now ||
          endTime < cutoff
        ) {
          return null;
        }

        const x1 = Math.max(startedAt, cutoff);
        const x2 = Math.min(endTime, now);

        if (x2 <= x1) {
          return null;
        }

        const monitor =
          typeof incident.monitorId === "object"
            ? incident.monitorId
            : null;

        const monitorId =
          monitor?._id || incident.monitorId;

        const monitorName =
          monitor?.name ||
          monitors.find(
            (item) => item._id === monitorId
          )?.name ||
          "Unknown monitor";

        return {
          id: String(incident._id),
          x1,
          x2,
          monitorId,
          monitorName,
          status: isOpen ? "OPEN" : "RESOLVED",
          startedAt,
          resolvedAt: isOpen ? null : resolvedAt,
          durationMs: isOpen
            ? Math.max(0, now - startedAt)
            : Number.isFinite(Number(incident.durationMs))
              ? Number(incident.durationMs)
              : Math.max(0, resolvedAt - startedAt)
        };
      })
      .filter(Boolean);
  }, [incidents, monitors, range]);

  // ==========================================
  // 1. RESPONSE TIME TREND
  // ==========================================

  const responseTimeData = useMemo(() => {
    const bucketSize = BUCKET_SIZES[range];

    const buckets = new Map();

    filteredRecords.forEach((record) => {
      if (record.status !== "UP") return;

      const timestamp = new Date(
        record.checkedAt
      ).getTime();

      const bucketTime =
        Math.floor(timestamp / bucketSize) *
        bucketSize;

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime
        });
      }

      const bucket = buckets.get(bucketTime);

      if (!bucket[record.monitorId]) {
        bucket[record.monitorId] = {
          total: 0,
          count: 0
        };
      }

      bucket[record.monitorId].total += Number(
        record.responseTime || 0
      );

      bucket[record.monitorId].count += 1;
    });

    // Include incident event timestamps in the X-axis domain.

    incidentMarkers.forEach((marker) => {
      if (!buckets.has(marker.timestamp)) {
        buckets.set(marker.timestamp, {
          timestamp: marker.timestamp
        });
      }
    });

    // Include incident band boundaries in the X-axis domain.

    incidentBands.forEach((band) => {
      [band.x1, band.x2].forEach((timestamp) => {
        if (!buckets.has(timestamp)) {
          buckets.set(timestamp, {
            timestamp
          });
        }
      });
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((bucket) => {
        const row = {
          timestamp: bucket.timestamp,
          time: formatBucketLabel(
            bucket.timestamp,
            range
          )
        };

        monitors.forEach((monitor) => {
          const value = bucket[monitor._id];

          row[monitor._id] = value
            ? Math.round(
                value.total / value.count
              )
            : null;
        });

        return row;
      });
  }, [
    filteredRecords,
    monitors,
    range,
    incidentMarkers,
    incidentBands
  ]);

  // SHOW MAXIMUM FIVE APIS

  const responseTimeMonitors = useMemo(() => {
    return monitors.slice(0, 5);
  }, [monitors]);

  // ==========================================
  // 2. UPTIME TREND
  // ==========================================

  const uptimeData = useMemo(() => {
    const bucketSize = BUCKET_SIZES[range];

    const buckets = new Map();

    filteredRecords.forEach((record) => {
      const timestamp = new Date(
        record.checkedAt
      ).getTime();

      const bucketTime =
        Math.floor(timestamp / bucketSize) *
        bucketSize;

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime,
          up: 0,
          total: 0
        });
      }

      const bucket = buckets.get(bucketTime);

      bucket.total += 1;

      if (record.status === "UP") {
        bucket.up += 1;
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((bucket) => ({
        ...bucket,
        time: formatBucketLabel(
          bucket.timestamp,
          range
        ),
        uptime: Number(
          (
            (bucket.up / bucket.total) *
            100
          ).toFixed(2)
        )
      }));
  }, [filteredRecords, range]);

  // ==========================================
  // 3. INCIDENT TIMELINE
  // ==========================================

  const incidentData = useMemo(() => {
    const bucketSize = BUCKET_SIZES[range];

    const buckets = new Map();

    filteredRecords.forEach((record) => {
      const timestamp = new Date(
        record.checkedAt
      ).getTime();

      const bucketTime =
        Math.floor(timestamp / bucketSize) *
        bucketSize;

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime,
          incidents: 0,
          successful: 0
        });
      }

      const bucket = buckets.get(bucketTime);

      if (record.status === "DOWN") {
        bucket.incidents += 1;
      } else if (record.status === "UP") {
        bucket.successful += 1;
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((bucket) => ({
        ...bucket,
        time: formatBucketLabel(
          bucket.timestamp,
          range
        )
      }));
  }, [filteredRecords, range]);

  // ==========================================
  // 4. CURRENT API HEALTH DISTRIBUTION
  // ==========================================

  const healthData = useMemo(() => {
    const counts = {
      UP: 0,
      DOWN: 0,
      PENDING: 0
          };

    monitors.forEach((monitor) => {
      if (monitor.status === "UP") {
        counts.UP += 1;
      } else if (monitor.status === "DOWN") {
        counts.DOWN += 1;
      } else {
        counts.PENDING += 1;
      }
    });

    return [
      {
        name: "UP",
        value: counts.UP,
        color: STATUS_COLORS.UP
      },
      {
        name: "DOWN",
        value: counts.DOWN,
        color: STATUS_COLORS.DOWN
      },
      {
        name: "PENDING",
        value: counts.PENDING,
        color: STATUS_COLORS.PENDING
      }
    ].filter((item) => item.value > 0);
  }, [monitors]);

  // ==========================================
  // 5. API PERFORMANCE COMPARISON
  // ==========================================

  const performanceData = useMemo(() => {
    return monitors
      .map((monitor) => {
        const successfulRecords = filteredRecords.filter(
          (record) =>
            record.monitorId === monitor._id &&
            record.status === "UP"
        );

        const average = successfulRecords.length
          ? successfulRecords.reduce(
              (sum, record) =>
                sum + Number(record.responseTime || 0),
              0
            ) / successfulRecords.length
          : 0;

        return {
          name: monitor.name,
          responseTime: Math.round(average),
          checks: successfulRecords.length
        };
      })
      .sort(
        (a, b) => b.responseTime - a.responseTime
      );
  }, [monitors, filteredRecords]);

  // ==========================================
  // SUMMARY VALUES
  // ==========================================

  const totalChecks = filteredRecords.length;

  const failedChecks = filteredRecords.filter(
    (record) => record.status === "DOWN"
  ).length;

  const successfulChecks = filteredRecords.filter(
    (record) => record.status === "UP"
  ).length;

  const averageResponseTime = successfulChecks
    ? Math.round(
        filteredRecords
          .filter((record) => record.status === "UP")
          .reduce(
            (sum, record) =>
              sum + Number(record.responseTime || 0),
            0
          ) / successfulChecks
      )
    : 0;

  const uptimePercentage = totalChecks
    ? (
        (successfulChecks / totalChecks) *
        100
      ).toFixed(2)
    : "0.00";

  // ==========================================
  // EMPTY CHART
  // ==========================================

  const EmptyChart = ({ message }) => (
    <div className="api-chart-empty">
      <span>◌</span>
      <strong>No monitoring data available</strong>
      <p>{message}</p>
    </div>
  );

  // ==========================================
  // MAIN COMPONENT UI
  // ==========================================

  return (
    <div className="api-analytics">

      {/* ANALYTICS HEADER */}

      <div className="analytics-heading">
        <div>
          <h2>API Analytics</h2>
          <p>
            Performance, reliability and incident insights
          </p>
        </div>

        <div className="time-filter">
          {TIME_RANGES.map((item) => (
            <button
              key={item.value}
              className={
                range === item.value ? "active" : ""
              }
              onClick={() =>
                onRangeChange?.(item.value)
              }
              disabled={loading}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ANALYTICS SUMMARY */}

      <div className="analytics-summary">

        <div className="analytics-summary-card">
          <span>Total Checks</span>
          <strong>{totalChecks}</strong>
          <small>Recorded in selected period</small>
        </div>

        <div className="analytics-summary-card">
          <span>Average Response</span>
          <strong>{averageResponseTime} ms</strong>
          <small>Successful checks</small>
        </div>

        <div className="analytics-summary-card">
          <span>Uptime</span>
          <strong>{uptimePercentage}%</strong>
          <small>Based on recorded checks</small>
        </div>

        <div className="analytics-summary-card">
          <span>Failed Checks</span>
          <strong className="analytics-danger">
            {failedChecks}
          </strong>
          <small>Failed health checks</small>
        </div>

      </div>

      {/* RESPONSE TIME PERCENTILES */}

      <div className="percentile-summary">

        <div className="percentile-card">
          <div className="percentile-card-header">
            <span>P50</span>
            <span className="percentile-indicator p50">MEDIAN</span>
          </div>

          <strong>
            {percentileStats.p50.toLocaleString()} ms
          </strong>

          <p>
            50% of successful checks are at or below this time
          </p>
        </div>

        <div className="percentile-card">
          <div className="percentile-card-header">
            <span>P95</span>
            <span className="percentile-indicator p95">95TH</span>
          </div>

          <strong>
            {percentileStats.p95.toLocaleString()} ms
          </strong>

          <p>
            95% of successful checks are at or below this time
          </p>
        </div>

        <div className="percentile-card">
          <div className="percentile-card-header">
            <span>P99</span>
            <span className="percentile-indicator p99">99TH</span>
          </div>

          <strong>
            {percentileStats.p99.toLocaleString()} ms
          </strong>

          <p>
            99% of successful checks are at or below this time
          </p>
        </div>

      </div>

      {/* PER-MONITOR PERCENTILE ANALYSIS */}

      <div className="monitor-percentile-section">

        <div className="monitor-percentile-heading">
          <div>
            <h3>Per-Monitor Latency Analysis</h3>
            <p>
              Compare response-time percentiles across your APIs
            </p>
          </div>

          <span className="monitor-percentile-count">
            {monitorPercentiles.length} APIs
          </span>
        </div>

        {monitorPercentiles.length === 0 ? (
          <EmptyChart message="Add an API monitor to see per-monitor latency analytics." />
        ) : (
          <div className="monitor-percentile-table-wrapper">
            <table className="monitor-percentile-table">
              <thead>
                <tr>
                    <th>API Monitor</th>
                    <th>P50</th>
                    <th>P95</th>
                    <th>P99</th>
                    <th>Samples</th>
                    <th>Latency Health</th>
                </tr>
              </thead>

              <tbody>
                {monitorPercentiles.map((monitor) => (
                  <tr key={monitor.id}>
                    <td className="percentile-monitor-name">
                      {monitor.name}
                    </td>

                    <td>
                      {monitor.samples
                        ? `${monitor.p50.toLocaleString()} ms`
                        : "—"}
                    </td>

                    <td>
                      <span className="p95-value">
                        {monitor.samples
                          ? `${monitor.p95.toLocaleString()} ms`
                          : "—"}
                      </span>
                    </td>

                    <td>
                      {monitor.samples
                        ? `${monitor.p99.toLocaleString()} ms`
                        : "—"}
                    </td>

                    <td>{monitor.samples}</td>
                    <td>
                    <span
                        className={`latency-health-badge ${monitor.latencyHealth.toLowerCase()}`}
                    >
                        {monitor.latencyHealth}
                    </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

{/* ==========================================
    OVERALL PERFORMANCE INTELLIGENCE
========================================== */}

<div className="overall-intelligence-section">

  <div className="overall-intelligence-heading">
    <div>
      <h3>Overall Performance Intelligence</h3>
      <p>
        A consolidated view of your API performance
      </p>
    </div>

    <span className="intelligence-live-label">
      ● ANALYTICS
    </span>
  </div>

  {/* PERFORMANCE SCORE */}

  <div className="intelligence-score-card">

    <div className="intelligence-score-info">
      <span>Performance Health Score</span>

      <strong>
        {overallPerformance.score !== null
          ? `${overallPerformance.score}/100`
          : "—"}
      </strong>

      <p>{overallPerformance.scoreLabel}</p>
    </div>

    <div
  className="intelligence-score-ring"
  style={{
    "--score": overallPerformance.score ?? 0
  }}
>
  <div className="intelligence-score-ring-inner">
        <strong>
          {overallPerformance.score !== null
            ? `${overallPerformance.score}%`
            : "N/A"}
        </strong>
      </div>
    </div>

  </div>

  {/* HEALTH COUNTS */}

  <div className="intelligence-status-grid">

    <div className="intelligence-status-card healthy">
      <span>Healthy APIs</span>
      <strong>{overallPerformance.healthy}</strong>
      <small>Within warning threshold</small>
    </div>

    <div className="intelligence-status-card degraded">
      <span>Degraded APIs</span>
      <strong>{overallPerformance.degraded}</strong>
      <small>Warning threshold exceeded</small>
    </div>

    <div className="intelligence-status-card critical">
      <span>Critical APIs</span>
      <strong>{overallPerformance.critical}</strong>
      <small>Critical threshold reached</small>
    </div>

    <div className="intelligence-status-card unknown">
      <span>Without Data</span>
      <strong>{overallPerformance.unknown}</strong>
      <small>No successful samples</small>
    </div>

  </div>

  {/* WORST PERFORMING API */}

  <div className="worst-api-card">

    <div className="worst-api-icon">
      !
    </div>

    <div className="worst-api-details">

      <span>Highest P95 Latency</span>

      {overallPerformance.worstMonitor ? (
        <>
          <strong>
            {overallPerformance.worstMonitor.name}
          </strong>

          <p>
            P95:{" "}
            {overallPerformance.worstMonitor.p95.toLocaleString()} ms
            {" · "}
            P99:{" "}
            {overallPerformance.worstMonitor.p99.toLocaleString()} ms
          </p>
        </>
      ) : (
        <>
          <strong>No performance data</strong>
          <p>Successful monitoring samples are required.</p>
        </>
      )}

    </div>

    {overallPerformance.worstMonitor && (
      <span
        className={`latency-health-badge ${
          overallPerformance.worstMonitor.latencyHealth.toLowerCase()
        }`}
      >
        {overallPerformance.worstMonitor.latencyHealth}
      </span>
    )}

  </div>

  <p className="intelligence-score-note">
    Performance score is a project-defined weighted indicator:
    Healthy = 100, Degraded = 60, Critical = 20.
    Monitors without successful samples are excluded.
    It is not an industry-standard SLA score.
  </p>

</div>

      {/* ==========================================
    LATENCY RECOMMENDATIONS ENGINE
========================================== */}

<div className="latency-recommendations-section">

  <div className="latency-recommendations-heading">
    <div>
      <h3>Latency Recommendations</h3>
      <p>
        Automated performance insights for your monitored APIs
      </p>
    </div>

    <span className="recommendation-count">
      {monitorPercentiles.length} ANALYZED
    </span>
  </div>

  <div className="recommendation-grid">

    {monitorPercentiles.map((monitor) => (

      <div
        className={`recommendation-card ${monitor.latencyHealth.toLowerCase()}`}
        key={`recommendation-${monitor.id}`}
      >

        <div className="recommendation-card-top">

          <div>
            <h4>{monitor.name}</h4>
            <span className="recommendation-subtitle">
              P95: {monitor.samples
                ? `${monitor.p95.toLocaleString()} ms`
                : "No data"}
            </span>
          </div>

          <span
            className={`latency-health-badge ${monitor.latencyHealth.toLowerCase()}`}
          >
            {monitor.latencyHealth}
          </span>

        </div>

        <div className="recommendation-metrics">
          <div>
            <span>P50</span>
            <strong>
              {monitor.samples
                ? `${monitor.p50.toLocaleString()} ms`
                : "—"}
            </strong>
          </div>

          <div>
            <span>P99</span>
            <strong>
              {monitor.samples
                ? `${monitor.p99.toLocaleString()} ms`
                : "—"}
            </strong>
          </div>

          <div>
            <span>Samples</span>
            <strong>{monitor.samples}</strong>
          </div>
        </div>

        <div className="recommendation-message">

          <div className="recommendation-message-title">
            <span>✦</span>
            {monitor.recommendationTitle}
          </div>

          <p>{monitor.recommendation}</p>

        </div>

        <div className="recommendation-thresholds">
          Warning: {monitor.warningThreshold.toLocaleString()} ms
          <span>·</span>
          Critical: {monitor.criticalThreshold.toLocaleString()} ms
        </div>

      </div>

    ))}

  </div>

</div>

      {/* CHART 1: RESPONSE TIME */}

      <div className="analytics-chart-card">

        <div className="analytics-chart-heading">
          <div>
            <h3>API Response Time</h3>
            <p>
              Response latency across monitored APIs
            </p>
          </div>

          <span className="chart-unit-label">
            Milliseconds (ms)
          </span>
        </div>

        {responseTimeData.length === 0 ? (
          <EmptyChart message="No successful checks found in this time range." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={responseTimeData}
              margin={{
                top: 15,
                right: 20,
                left: 0,
                bottom: 5
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#26364d"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) =>
                  formatBucketLabel(value, range)
                }
                stroke="#8998ae"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="response"
                stroke="#8998ae"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={55}
              />

              <YAxis
                yAxisId="incident"
                orientation="right"
                domain={[0, 1]}
                hide
              />

              <Tooltip
                content={<IncidentTooltip />}
                shared={false}
                cursor={false}
              />

              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  paddingTop: "12px"
                }}
              />

              {/* INCIDENT DURATION BANDS */}

              {incidentBands.map((band) => (
                <ReferenceArea
                  key={`incident-band-${band.id}`}
                  x1={band.x1}
                  x2={band.x2}
                  yAxisId="response"
                  fill="#f05c70"
                  fillOpacity={0.13}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                />
              ))}

              {/* INCIDENT START AND RECOVERY LINES */}

              {incidentMarkers.map((marker) => {
                const isRecovery =
                  marker.type === "RECOVERY";

                return (
                  <ReferenceLine
                    key={marker.id}
                    x={marker.timestamp}
                    yAxisId="response"
                    stroke={
                      isRecovery
                        ? "#22c58b"
                        : "#f05c70"
                    }
                    strokeWidth={1.5}
                    strokeDasharray={
                      isRecovery
                        ? "4 4"
                        : "5 3"
                    }
                    ifOverflow="discard"
                  />
                );
              })}

              {/* RESPONSE TIME LINES */}

              {responseTimeMonitors.map(
                (monitor, index) => (
                  <Line
                    key={monitor._id}
                    yAxisId="response"
                    type="monotone"
                    dataKey={monitor._id}
                    name={monitor.name}
                    stroke={
                      COLORS[index % COLORS.length]
                    }
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )
              )}

              {/* INTERACTIVE INCIDENT DOTS */}

              <Scatter
                data={incidentMarkers}
                dataKey="y"
                xAxisId={0}
                yAxisId="incident"
                name="Incident Events"
                isAnimationActive={false}
                legendType="none"
                shape={IncidentMarkerShape}
              />

            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* INCIDENT LEGEND */}

        <div className="incident-correlation-legend">

          <span>
            <i className="incident-legend-start" />
            Incident Started
          </span>

          <span>
            <i className="incident-legend-recovery" />
            Incident Recovered
          </span>

          <span>
            <i className="incident-legend-duration" />
            Downtime Period
          </span>

        </div>

        {monitors.length > 5 && (
          <p className="chart-note">
            Showing the first 5 APIs. Individual monitor
            details show their own history.
          </p>
        )}

      </div>

      {/* CHART 2: UPTIME AND CHART 3: INCIDENTS */}

      <div className="analytics-two-column">

        {/* UPTIME CHART */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-heading">
            <div>
              <h3>API Availability Trend</h3>
              <p>
                Successful checks as a percentage of all checks
              </p>
            </div>
          </div>

          {uptimeData.length === 0 ? (
            <EmptyChart message="No availability data for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={uptimeData}
                margin={{
                  top: 15,
                  right: 15,
                  left: 0,
                  bottom: 5
                }}
              >

                <defs>
                  <linearGradient
                    id="uptimeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#22c58b"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="#22c58b"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#26364d"
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="uptime"
                  name="Availability"
                  unit="%"
                  stroke="#22c58b"
                  strokeWidth={2.5}
                  fill="url(#uptimeGradient)"
                />

              </AreaChart>
            </ResponsiveContainer>
          )}

        </div>

        {/* INCIDENT CHART */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-heading">
            <div>
              <h3>Incident Timeline</h3>
              <p>Failed API checks over time</p>
            </div>
          </div>

          {incidentData.length === 0 ? (
            <EmptyChart message="No monitoring records for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={incidentData}
                margin={{
                  top: 15,
                  right: 10,
                  left: 0,
                  bottom: 5
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#26364d"
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "10px"
                  }}
                />

                <Bar
                  dataKey="incidents"
                  name="Failed Checks"
                  fill="#f05c70"
                  radius={[5, 5, 0, 0]}
                />

                <Bar
                  dataKey="successful"
                  name="Successful Checks"
                  fill="#22c58b"
                  radius={[5, 5, 0, 0]}
                />

              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

      </div>

      {/* CHART 4: HEALTH DISTRIBUTION AND CHART 5: PERFORMANCE */}

      <div className="analytics-two-column">

        {/* API HEALTH DISTRIBUTION */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-heading">
            <div>
              <h3>API Health Distribution</h3>
              <p>Current status of registered APIs</p>
            </div>
          </div>

          {monitors.length === 0 ? (
            <EmptyChart message="Add an API monitor to see its health." />
          ) : (
            <div className="health-distribution">

              <ResponsiveContainer width="100%" height={250}>
                <PieChart>

                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {healthData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip content={<CustomTooltip />} />

                </PieChart>
              </ResponsiveContainer>

              <div className="health-center-label">
                <strong>{monitors.length}</strong>
                <span>Total APIs</span>
              </div>

              <div className="health-legend">

                {[
                  {
                    name: "UP",
                    color: STATUS_COLORS.UP
                  },
                  {
                    name: "DOWN",
                    color: STATUS_COLORS.DOWN
                  },
                  {
                    name: "PENDING",
                    color: STATUS_COLORS.PENDING
                  }
                ].map((item) => {
                  const count =
                    healthData.find(
                      (entry) => entry.name === item.name
                    )?.value || 0;

                  return (
                    <div
                      className="health-legend-item"
                      key={item.name}
                    >
                      <span>
                        <i
                          style={{
                            background: item.color
                          }}
                        />
                        {item.name}
                      </span>

                      <strong>{count}</strong>
                    </div>
                  );
                })}

              </div>

            </div>
          )}

        </div>

        {/* API PERFORMANCE COMPARISON */}

        <div className="analytics-chart-card">

          <div className="analytics-chart-heading">
            <div>
              <h3>API Performance Comparison</h3>
              <p>
                Average successful response time per API
              </p>
            </div>
          </div>

          {performanceData.length === 0 ? (
            <EmptyChart message="Add an API monitor to compare performance." />
          ) : (
            <ResponsiveContainer
              width="100%"
              height={Math.max(
                250,
                performanceData.length * 48
              )}
            >
              <BarChart
                data={performanceData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 20,
                  left: 15,
                  bottom: 5
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#26364d"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={105}
                  stroke="#8998ae"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="responseTime"
                  name="Average Response"
                  unit=" ms"
                  fill="#718cff"
                  radius={[0, 5, 5, 0]}
                  barSize={19}
                />

              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

      </div>

      {/* DATA COVERAGE NOTE */}

      <div className="analytics-data-note">
        <span>ⓘ</span>
        Analytics are calculated using monitoring history
        fetched from MongoDB for the selected time range.
        {loading && " Updating analytics..."}
      </div>

    </div>
  );
}

export default DashboardCharts;