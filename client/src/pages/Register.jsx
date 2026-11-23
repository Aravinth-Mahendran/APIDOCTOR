
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (form.name.trim().length < 2 || form.name.trim().length > 50) {
      setError("Name must contain between 2 and 50 characters.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      });

      setSuccess(
        response.data.message ||
        "Registration successful! Please check your email."
      );

      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">

        {/* BRAND */}
        <div className="auth-brand">
          <h1>
            API<span>DOCTOR</span>
          </h1>
          <p>Monitor. Diagnose. Recover.</p>
        </div>

        {/* HEADING */}
        <div className="auth-heading">
          <h2>Create your account</h2>
          <p>
            Start monitoring your APIs with APIDOCTOR.
            Create your account to get started.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="register-success">
            <div className="register-success-icon">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <h3>Check your inbox!</h3>

            <p>{success}</p>

            <p>
              We've sent an email verification link.
              Open your inbox and verify your email
              address to activate your APIDOCTOR account.
            </p>

            <Link to="/login" className="auth-submit">
              Continue to Login →
            </Link>
          </div>
        )}

        {/* REGISTRATION FORM */}
        {!success && (
          <form onSubmit={handleSubmit}>

            {/* NAME */}
            <div className="auth-field">
              <label htmlFor="register-name">
                Full Name
              </label>

              <input
                id="register-name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                minLength={2}
                maxLength={50}
                autoComplete="name"
                required
              />
            </div>

            {/* EMAIL */}
            <div className="auth-field">
              <label htmlFor="register-email">
                Email Address
              </label>

              <input
                id="register-email"
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
              <label htmlFor="register-password">
                Password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  autoComplete="new-password"
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
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>

              <span className="register-field-hint">
                Use at least 8 characters.
              </span>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="auth-field">
              <label htmlFor="register-confirm-password">
                Confirm Password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account →"
              )}
            </button>

          </form>
        )}

        {/* FOOTER */}
        <div className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </div>

        <div className="register-security">
          <span>🔒</span>
          Your account is protected with secure authentication.
        </div>

      </div>
    </div>
  );
}

export default Register;
