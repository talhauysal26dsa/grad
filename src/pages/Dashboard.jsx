import React, { useState, useRef, useEffect } from 'react';
import '../styles/dashboard.css';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/', { replace: true });
    }

    // Tarayıcı geri/ileri butonunu devre dışı bırak ve session'ı temizle
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = function() {
      window.history.pushState(null, '', window.location.href);
      quitSystem('back');
    };
  }, []);

  function showLogoutModal() {
    setShowModal(true);
    // 1 dakika sonra otomatik logout
    timeoutRef.current = setTimeout(() => {
      quitSystem('timeout');
    }, 60000);
  }

  function hideLogoutModal() {
    setShowModal(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  async function quitSystem(reason = 'manual') {
    setShowModal(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {}
    const userId = currentUser ? currentUser.userID : null;
    try {
      await fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: userId })
      });
    } catch (e) {
      // ignore error
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(function(c) {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      
      switch (reason) {
        case 'timeout':
          navigate('/?session=expired');
          break;
        case 'back':
          navigate('/?session=back', { replace: true });
          break;
        default:
          navigate('/?logout=success');
      }
    }
  }

  return (
    <div className="wrapper">
      <header>
        <div className="header-content">
          <span className="logo">IZMIR INSTITUTE OF TECHNOLOGY</span>
          <span className="tagline">Turkey's Technology Base</span>
        </div>
      </header>

      <main>
        <div className="logout-btn" onClick={showLogoutModal}>
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" />
        </div>
        {/* Logout Modal */}
        <div className="modal" style={{ display: showModal ? 'flex' : 'none' }}>
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={hideLogoutModal}>Cancel</button>
              <button onClick={() => quitSystem('manual')}>Quit</button>
            </div>
          </div>
        </div>
      </main>

      <div className="footer-note">
        Türkçe halini ziyaret edin
      </div>

      <footer>
        &copy; 2023 Graduation Management System—Izmir Institute of Technology
      </footer>
    </div>
  );
} 