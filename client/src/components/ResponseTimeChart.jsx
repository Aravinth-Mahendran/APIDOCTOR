
import React, { useMemo } from "react";

function ResponseTimeChart({
  history = [],
  title = "Response Time History",
  subtitle = "API response performance",
  height = 220
}) {
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .slice(-30)
      .map((record) => ({
        time: record.checkedAt,
        responseTime: Number(record.responseTime) || 0,
        status: record.status
      }));
  }, [history]);

  const width = 800;
  const padding = { top: 20, right: 20, bottom: 35, left: 50 };

  const maxValue = Math.max(
    ...chartData.map((item) => item.responseTime),
    100
  );

  const points = chartData.map((item, index) => {
    const x =
      padding.left +
      (index / Math.max(chartData.length - 1, 1)) *
        (width - padding.left - padding.right);

    const y =
      padding.top +
      (1 - item.responseTime / maxValue) *
        (height - padding.top - padding.bottom);

    return { ...item, x, y };
  });

  const linePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPoints = points.length
    ? `${padding.left},${height - padding.bottom} ${linePoints} ${points[points.length - 1].x},${height - padding.bottom}`
    : "";

  return (
    <div className="chart-card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <span className="chart-unit">Milliseconds</span>
      </div>

      {points.length > 0 ? (
        <div className="svg-chart-wrapper">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="svg-chart"
            role="img"
            aria-label="Response time history chart"
          >
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#718cff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#718cff" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((index) => {
              const y =
                padding.top +
                (index / 3) *
                  (height - padding.top - padding.bottom);

              return (
                <line
                  key={index}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#26344b"
                  strokeDasharray="5 5"
                />
              );
            })}

            <polygon
              points={areaPoints}
              fill="url(#responseGradient)"
            />

            {points.length > 1 && (
              <polyline
                points={linePoints}
                fill="none"
                stroke="#8299ff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={point.status === "DOWN" ? "#f05c70" : "#8299ff"}
                  stroke="#111b2d"
                  strokeWidth="2"
                >
                  <title>
                    {point.responseTime} ms · {point.status} ·{" "}
                    {point.time
                      ? new Date(point.time).toLocaleString()
                      : "Unknown time"}
                  </title>
                </circle>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="empty-chart">
          <div className="empty-chart-icon">▥</div>
          <p>No response-time data available.</p>
          <span>Monitoring records will appear here.</span>
        </div>
      )}

      <div className="chart-footer">
        <span>
          Checks: <strong>{chartData.length}</strong>
        </span>

        <span>
          Latest:{" "}
          <strong>
            {chartData.length
              ? `${chartData[chartData.length - 1].responseTime} ms`
              : "—"}
          </strong>
        </span>
      </div>
    </div>
  );
}

export default ResponseTimeChart;
