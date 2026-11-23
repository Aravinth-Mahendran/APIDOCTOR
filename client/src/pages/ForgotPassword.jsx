
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await API.post(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase()
        }
      );

      setMessage(response.data.message);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card forgot-password-card">

        {/* BRAND */}
        <div className="auth-brand">
          <h1>
            API<span>Watch</span>
          </h1>
          <p>API Monitoring Platform</p>
        </div>

        {/* MAIL ICON */}
        <div className="forgot-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        {/* HEADING */}
        <div className="auth-heading">
          <h2>Forgot your password?</h2>

          <p>
            Don't worry. It happens to everyone.
            Enter your registered email address and
            we'll send you a secure password reset link.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          <div className="auth-field">
            <label htmlFor="forgot-email">
              Email Address
            </label>

            <input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage("");
                setError("");
              }}
              autoComplete="email"
              required
            />
          </div>

          {/* SUCCESS */}
          {message && (
            <div className="auth-success">
              <strong>Request received</strong>
              <p>{message}</p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="auth-error">
              <strong>Unable to process request</strong>
              <p>{error}</p>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <span className="auth-spinner"></span>
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>

        </form>

        {/* FOOTER */}
        <div className="auth-footer">
          <Link to="/login">
            <span>←</span> Back to Login
          </Link>
        </div>

        {/* SECURITY NOTE */}
        <div className="forgot-security">
          <span>🔒</span>
          Your password reset link is secure and expires
          after 15 minutes.
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;
