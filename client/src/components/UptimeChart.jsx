
import React, { useMemo } from "react";

function UptimeChart({ history = [], title = "Uptime History" }) {
  const records = useMemo(
    () => [...history].reverse().slice(-60),
    [history]
  );

  const successful = records.filter(
    (record) => record.status === "UP"
  ).length;

  const failed = records.filter(
    (record) => record.status === "DOWN"
  ).length;

  const uptime = records.length
    ? ((successful / records.length) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="chart-card uptime-chart-card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          <p>Availability across recorded health checks</p>
        </div>

        <span className="uptime-value">{uptime}%</span>
      </div>

      {records.length > 0 ? (
        <>
          <div className="uptime-timeline">
            {records.map((record, index) => (
              <div
                key={record._id || index}
                className={`uptime-segment ${
                  record.status === "UP" ? "up" : "down"
                }`}
                title={`${record.status} · ${
                  record.checkedAt
                    ? new Date(record.checkedAt).toLocaleString()
                    : "Unknown time"
                }`}
              />
            ))}
          </div>

          <div className="uptime-legend">
            <span>
              <i className="legend-dot up" />
              UP: {successful}
            </span>

            <span>
              <i className="legend-dot down" />
              DOWN: {failed}
            </span>
          </div>
        </>
      ) : (
        <div className="empty-chart">
          <p>No uptime history available.</p>
        </div>
      )}
    </div>
  );
}

export default UptimeChart;
