import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';

export default function Verify() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await axios.post('http://localhost:8080/api/auth/verify', { email, code });
      setMessage('Email verified! You can now login.');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data || 'Verification failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await axios.post('http://localhost:8080/api/auth/send-verification', { email });
      setMessage('Verification code sent again.');
    } catch (err) {
      setError(err.response?.data || 'Failed to resend code!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="form-container">
        <img src={logo} alt="Logo" className="logo" />
        <div className="title">Graduation Management System</div>
        <div className="subtitle">Email Verification</div>
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 12 }}>A verification code was sent to <b>{email}</b>.</div>
          <input
            className="input"
            placeholder="Enter verification code"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          {message && <div style={{ color: 'green', marginBottom: 8 }}>{message}</div>}
          <button
            className="btn"
            type="submit"
            disabled={code.length !== 6 || loading}
            style={{
              backgroundColor: code.length === 6 && !loading ? '#9A0E20' : '#ccc',
              color: code.length === 6 && !loading ? 'white' : '#888',
              cursor: code.length === 6 && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            Verify
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleResend}
            disabled={loading}
            style={{
              backgroundColor: '#9A0E20',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            Send Again
          </button>
        </form>
      </div>
    </div>
  );
} 