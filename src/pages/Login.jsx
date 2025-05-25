// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';

export default function Login() {
  const [emailName, setEmailName] = useState('');
  const [emailDomain, setEmailDomain] = useState('@iyte.edu.tr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionExpired = params.get('session') === 'expired';
  const sessionBack = params.get('session') === 'back';
  const [showSessionExpired, setShowSessionExpired] = useState(sessionExpired);
  const [showSessionBack, setShowSessionBack] = useState(sessionBack);
  const logoutSuccess = params.get('logout') === 'success';
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(logoutSuccess);

  const fullEmail = emailName + emailDomain;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        email: fullEmail,
        password,
      });
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      // Rol bazlı yönlendirme
      const role = (response.data.role || response.data.role_role_name || '').toLowerCase();
      const roleId = response.data.role_id || response.data.role_role_id;
      if (role === 'admin' || roleId === 6) {
        navigate('/delete-user');
      } else if (role === 'faculty secretary' || role === 'faculty_secretary' || roleId === 1) {
        navigate('/faculty-secretary-sort');
      } else if (role === 'department secretary' || role === 'department_secretary' || roleId === 2) {
        navigate('/import-transcript');
      } else if (role === 'advisor' || roleId === 3) {
        navigate('/form-preparation');
      } else if (role === 'student affairs' || roleId === 4) {
        navigate('/student-affairs-sort');
      } else if (role === 'student' || roleId === 5) {
        navigate('/check-status');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response && err.response.status === 403 && err.response.data === 'System is closed') {
        setError('System is closed');
      } else {
        setError('Invalid Credentials!');
      }
    }
  }

  function handleForgotPassword() {
    alert("Password reset link will be sent to your email (demo)");
  }

  return (
    <div className="login-bg">
      <div className="form-container">
        {showSessionExpired && (
          <div style={{
            background: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            padding: '12px 36px 12px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: 'bold',
            position: 'relative'
          }}>
            Your session has been terminated due to prolonged inactivity.
            <button
              onClick={() => {
                setShowSessionExpired(false);
                navigate('/', { replace: true });
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                background: 'transparent',
                border: 'none',
                fontSize: 18,
                color: '#856404',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              aria-label="Close"
            >×</button>
          </div>
        )}
        {showSessionBack && (
          <div style={{
            background: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            padding: '12px 36px 12px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: 'bold',
            position: 'relative'
          }}>
            Your session has been terminated because you navigated back.
            <button
              onClick={() => {
                setShowSessionBack(false);
                navigate('/', { replace: true });
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                background: 'transparent',
                border: 'none',
                fontSize: 18,
                color: '#856404',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              aria-label="Close"
            >×</button>
          </div>
        )}
        {showLogoutSuccess && (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            padding: '12px 36px 12px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontWeight: 'bold',
            position: 'relative'
          }}>
            You have been logged out successfully.
            <button
              onClick={() => {
                setShowLogoutSuccess(false);
                navigate('/', { replace: true });
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 8,
                background: 'transparent',
                border: 'none',
                fontSize: 18,
                color: '#155724',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              aria-label="Close"
            >×</button>
          </div>
        )}
        <img src={logo} alt="Logo" className="logo" />
        <div className="title">Graduation Management System</div>
        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            <input
              className="input"
              style={{ flex: 2 }}
              placeholder="Email username"
              value={emailName}
              onChange={e => setEmailName(e.target.value)}
            />
            <select
              className="input"
              style={{ flex: 1 }}
              value={emailDomain}
              onChange={e => setEmailDomain(e.target.value)}
            >
              <option value="@iyte.edu.tr">@iyte.edu.tr</option>
              <option value="@std.iyte.edu.tr">@std.iyte.edu.tr</option>
            </select>
          </div>
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          <button
            className="btn"
            type="submit"
            disabled={!emailName || !password}
            style={{
              backgroundColor: emailName && password ? '#9A0E20' : '#ccc',
              color: emailName && password ? 'white' : '#888',
              cursor: emailName && password ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Login
          </button>
          <div className="link">Don't have an account? <Link to="/register">Register</Link></div>
          <div className="link"><Link to="/forgot-password">Forgot Password?</Link></div>
        </form>
      </div>
    </div>
  );
}