
import React, { useMemo } from "react";

function StatusDistribution({ history = [] }) {
  const distribution = useMemo(() => {
    const result = {
      up: history.filter((item) => item.status === "UP").length,
      down: history.filter((item) => item.status === "DOWN").length
    };

    return {
      ...result,
      total: result.up + result.down,
      upPercentage:
        history.length > 0
          ? (result.up / history.length) * 100
          : 0
    };
  }, [history]);

  const downPercentage = 100 - distribution.upPercentage;

  return (
    <div className="chart-card distribution-card">
      <div className="card-header">
        <div>
          <h3>Status Distribution</h3>
          <p>Successful versus failed API checks</p>
        </div>
      </div>

      {distribution.total > 0 ? (
        <>
          <div
            className="distribution-donut"
            style={{
              background: `conic-gradient(
                #22c58b 0% ${distribution.upPercentage}%,
                #f05c70 ${distribution.upPercentage}% 100%
              )`
            }}
          >
            <div className="donut-center">
              <strong>{distribution.total}</strong>
              <span>Total checks</span>
            </div>
          </div>

          <div className="distribution-legend">
            <div>
              <span>
                <i className="legend-dot up" />
                Successful
              </span>

              <strong>{distribution.up}</strong>
            </div>

            <div>
              <span>
                <i className="legend-dot down" />
                Failed
              </span>

              <strong>{distribution.down}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-chart">
          <p>No status data available.</p>
        </div>
      )}
    </div>
  );
}

export default StatusDistribution;
