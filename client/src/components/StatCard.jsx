
import React from "react";

function StatCard({
  title,
  value,
  description,
  icon = "◉",
  color = "blue",
  trend,
  className = ""
}) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-top">
        <span>{title}</span>
        <span className={`stat-icon ${color}`}>
          {icon}
        </span>
      </div>

      <h2>{value ?? "—"}</h2>

      <div className="stat-card-bottom">
        <p>{description}</p>

        {trend && (
          <span className={`stat-trend ${trend.direction || ""}`}>
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
