
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/axios";

function VerifyEmail() {
  const { token } = useParams();
  const requestStarted = useRef(false);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (requestStarted.current) return;

    requestStarted.current = true;

    const verifyEmail = async () => {
      try {
        const response = await API.get(
          `/auth/verify-email/${token}`
        );

        setSuccess(true);
        setMessage(response.data.message);

      } catch (error) {
        setSuccess(false);
        setMessage(
          error.response?.data?.message ||
          "Unable to verify your email. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card verify-email-card">

        {/* BRAND */}
        <div className="auth-brand">
          <h1>
            API<span>Watch</span>
          </h1>
          <p>API Monitoring Platform</p>
        </div>

        {/* STATUS ICON */}
        <div
          className={`verify-icon ${
            loading
              ? "verify-loading"
              : success
              ? "verify-success"
              : "verify-failed"
          }`}
        >
          {loading ? (
            <span className="verify-spinner"></span>
          ) : success ? (
            <svg
              viewBox="0 0 24 24"
              width="34"
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="34"
              height="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          )}
        </div>

        {/* HEADING */}
        <div className="auth-heading verify-heading">
          {loading ? (
            <>
              <h2>Verifying your email</h2>
              <p>
                Please wait while we securely verify
                your APIWatch account.
              </p>
            </>
          ) : success ? (
            <>
              <h2>Email verified!</h2>
              <p>
                Your email address has been successfully
                verified. Your APIWatch account is now active.
              </p>
            </>
          ) : (
            <>
              <h2>Verification unsuccessful</h2>
              <p>
                We couldn't verify your email address.
                Your verification link may be invalid or expired.
              </p>
            </>
          )}
        </div>

        {/* STATUS MESSAGE */}
        {!loading && (
          <div className={success ? "auth-success" : "auth-error"}>
            {message}
          </div>
        )}

        {/* ACTION */}
        {!loading && (
          <div className="verify-actions">
            {success ? (
              <Link to="/login" className="auth-submit">
                Continue to Login →
              </Link>
            ) : (
              <>
                <Link to="/login" className="auth-submit">
                  Go to Login
                </Link>

                <p className="verify-help">
                  Need another verification link?
                  You can request one from the login page.
                </p>
              </>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="verify-footer">
          <span className="verify-footer-dot"></span>
          Secure account verification
        </div>

      </div>
    </div>
  );
}

export default VerifyEmail;
