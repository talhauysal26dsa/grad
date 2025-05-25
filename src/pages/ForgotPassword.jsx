import { useState } from "react";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import axios from "axios";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isValidIyteEmail = email.endsWith('@iyte.edu.tr') || email.endsWith('@std.iyte.edu.tr');

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:8080/api/auth/forgot-password", { email });
      setStep(2);
      setMessage("A verification code was sent to your email.");
    } catch (err) {
      setError(err.response?.data || "Failed to send code!");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await axios.post("http://localhost:8080/api/auth/verify-reset-code", { email, code: enteredCode });
      setStep(3);
      setMessage("");
    } catch (err) {
      setError(err.response?.data || "Invalid code. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:8080/api/auth/reset-password", { email, code: enteredCode, newPassword });
      setStep(4);
    } catch (err) {
      setError(err.response?.data || "Failed to reset password!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="form-container">
        <img src={logo} alt="Logo" className="logo" />
        <div className="title">Graduation Management System</div>
        <div className="subtitle">Reset your password</div>

        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <input
              className="input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            {message && <div style={{ color: 'green', marginBottom: 8 }}>{message}</div>}
            <button
              type="submit"
              className="btn"
              disabled={!isValidIyteEmail || loading}
              style={{
                backgroundColor: !isValidIyteEmail || loading ? '#ccc' : '#9A0E20',
                color: !isValidIyteEmail || loading ? '#888' : 'white',
                cursor: !isValidIyteEmail || loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
            <div className="link"><Link to="/">Back to Login</Link></div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <div className="title">Verification</div>
            <div style={{ marginBottom: 12 }}>
              A verification code was sent to <b>{email}</b>.
            </div>
            <input
              className="input"
              placeholder="Enter verification code"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              maxLength={6}
            />
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            {message && <div style={{ color: 'green', marginBottom: 8 }}>{message}</div>}
            <button
              className="btn"
              type="submit"
              disabled={enteredCode.length !== 6 || loading}
              style={{
                backgroundColor: enteredCode.length === 6 && !loading ? '#9A0E20' : '#ccc',
                color: enteredCode.length === 6 && !loading ? 'white' : '#888',
                cursor: enteredCode.length === 6 && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                marginBottom: 8,
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                setError("");
                setMessage("");
                setLoading(true);
                try {
                  await axios.post("http://localhost:8080/api/auth/forgot-password", { email });
                  setMessage("Verification code sent again.");
                } catch (err) {
                  setError(err.response?.data || "Failed to resend code!");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                backgroundColor: '#9A0E20',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              Send Again
            </button>
            <div className="link"><Link to="/">Back to Login</Link></div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            <button type="submit" className="btn" disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || loading}
              style={{
                backgroundColor: newPassword && confirmPassword && newPassword === confirmPassword && !loading ? '#9A0E20' : '#ccc',
                color: newPassword && confirmPassword && newPassword === confirmPassword && !loading ? 'white' : '#888',
                cursor: newPassword && confirmPassword && newPassword === confirmPassword && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="link"><Link to="/">Back to Login</Link></div>
          </form>
        )}

        {step === 4 && (
          <div>
            <p style={{ fontSize: "14px", color: "#333" }}>
              Your password has been reset successfully. You can now <Link to="/">login</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
