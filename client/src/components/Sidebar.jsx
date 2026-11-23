
import React from "react";

const Sidebar = ({
  activeNav,
  onNavigate,
  backendConnected
}) => {
  const navigationItems = [
    {
      label: "Dashboard",
      icon: "▦"
    },
    {
      label: "Monitors",
      icon: "◉"
    },
    {
      label: "Incidents",
      icon: "⚠"
    },
    {
      label: "Notifications",
      icon: "🔔"
    }
  ];

  return (
    <aside className="sidebar">

      {/* BRAND */}

      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">✚</span>
          <span>APIDOCTOR</span>
        </div>

        <p className="sidebar-tagline">
          Monitor. Diagnose. Recover.
        </p>
      </div>

      {/* NAVIGATION */}

      <div className="sidebar-section">
        <p className="sidebar-section-title">
          MAIN MENU
        </p>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item ${
                activeNav === item.label ? "active" : ""
              }`}
              onClick={() => onNavigate(item.label)}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span className="nav-label">
                {item.label}
              </span>

              {activeNav === item.label && (
                <span className="nav-active-indicator" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* BACKEND STATUS */}

      <div className="sidebar-footer">
        <div className="backend-status">
          <span
            className={`backend-status-dot ${
              backendConnected ? "connected" : "disconnected"
            }`}
          />

          <div className="backend-status-info">
            <span>Backend Status</span>
            <strong>
              {backendConnected ? "Connected" : "Disconnected"}
            </strong>
          </div>
        </div>

        <div className="sidebar-version">
          APIDOCTOR v1.0.0
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;
