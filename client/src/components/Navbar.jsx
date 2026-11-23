
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({
  title = "Dashboard",
  subtitle = "Monitor your APIs in real time",
  onRefresh = () => {},
  onAddMonitor = () => {},
  onBack = () => {},
  showAddButton = true,
  showBackButton = false,
  loading = false
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return "U";

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  return (
    <header className="topbar">

      {/* PAGE TITLE */}
      <div className="topbar-title">
        {showBackButton && (
          <button
            className="back-btn"
            onClick={onBack}
            type="button"
          >
            ← Back
          </button>
        )}

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div className="topbar-right">

        <div className="topbar-actions">
          <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            type="button"
          >
            <span className={loading ? "refresh-spinning" : ""}>
              ↻
            </span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {showAddButton && (
            <button
              className="add-monitor-btn"
              onClick={onAddMonitor}
              type="button"
            >
              + Add Monitor
            </button>
          )}
        </div>

        {/* USER PROFILE */}
        <div className="navbar-user">
          <div className="navbar-avatar">
            {getInitials(user?.name)}
          </div>

          <div className="navbar-user-info">
            <strong>{user?.name || "User"}</strong>
            <span>Administrator</span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            type="button"
            title="Sign out"
          >
            <span>↪</span>
            Logout
          </button>
        </div>

      </div>

    </header>
  );
}

export default Navbar;
