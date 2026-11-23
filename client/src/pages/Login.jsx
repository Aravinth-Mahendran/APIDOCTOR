
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    setError("");
    setResendError("");
  };

  // LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setShowResend(false);
    setResendMessage("");
    setResendError("");
    setLoading(true);

    try {
      await login(form.email.trim().toLowerCase(), form.password);
      navigate("/", { replace: true });

    } catch (err) {
      const status = err.response?.status;

      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );

      if (status === 403) {
        setShowResend(true);
      }

    } finally {
      setLoading(false);
    }
  };

  // RESEND VERIFICATION EMAIL
  const handleResendVerification = async () => {
    setResendMessage("");
    setResendError("");

    if (!form.email.trim()) {
      setResendError("Please enter your email address.");
      return;
    }

    setResendLoading(true);

    try {
      const response = await API.post(
        "/auth/resend-verification",
        {
          email: form.email.trim().toLowerCase()
        }
      );

      setResendMessage(response.data.message);

    } catch (err) {
      setResendError(
        err.response?.data?.message ||
        "Unable to process your request. Please try again."
      );

    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card login-card">

        {/* BRAND */}
        <div className="auth-brand">
          <h1>
            API<span>DOCTOR</span>
          </h1>

          <p>Monitor. Diagnose. Recover.</p>
        </div>

        {/* HEADING */}
        <div className="auth-heading">
          <h2>Welcome back</h2>

          <p className="auth-subtitle">
            Sign in to your API monitoring dashboard
          </p>
        </div>

        {/* LOGIN ERROR */}
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* EMAIL VERIFICATION */}
        {showResend && (
          <div className="resend-verification-box">

            <h3>Email verification required</h3>

            <p>
              Your account needs email verification before
              you can sign in. Please verify your email address.
            </p>

            <button
              type="button"
              className="auth-submit"
              onClick={handleResendVerification}
              disabled={resendLoading}
            >
              {resendLoading
                ? "Sending..."
                : "Resend Verification Email"}
            </button>

            {resendMessage && (
              <div className="auth-success">
                {resendMessage}
              </div>
            )}

            {resendError && (
              <div className="auth-error">
                {resendError}
              </div>
            )}

          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit}>

          {/* EMAIL */}
          <div className="auth-field">
            <label htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="auth-field">

            <div className="password-label-row">
              <label htmlFor="login-password">
                Password
              </label>

              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <span className="eye-icon">
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </button>
            </div>

          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

        {/* REGISTER LINK */}
        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>

        {/* SECURITY FOOTER */}
        <div className="register-security">
          <span>🔒</span>
          Your API monitoring dashboard, secured.
        </div>

      </div>
    </div>
  );
}

export default Login;
