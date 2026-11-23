
import React from "react";

function LoadingSkeleton({
  type = "card",
  count = 1
}) {
  if (type === "stats") {
    return (
      <div className="stats-grid">
        {Array.from({ length: count }).map((_, index) => (
          <div className="stat-card skeleton-card" key={index}>
            <div className="skeleton skeleton-small" />
            <div className="skeleton skeleton-number" />
            <div className="skeleton skeleton-text" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className="chart-card skeleton-chart">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-chart-area" />
        <div className="skeleton skeleton-text" />
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="monitor-table-card">
        {Array.from({ length: count }).map((_, index) => (
          <div className="skeleton-table-row" key={index}>
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stat-card skeleton-card">
      <div className="skeleton skeleton-small" />
      <div className="skeleton skeleton-number" />
      <div className="skeleton skeleton-text" />
    </div>
  );
}

export default LoadingSkeleton;
