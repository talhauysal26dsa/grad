import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import studentIcon from '../assets/student_icon.png';

const menuItems = [
  { key: 'check', label: 'Check Status' },
];

export default function CheckStatus() {
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('check');
  const [lastCheck, setLastCheck] = useState('');
  const [currentStatus, setCurrentStatus] = useState('--');
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userId = currentUser ? currentUser.userID : null;
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';

  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:8080/api/auth/graduation-status/${userId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.lastCheck) {
          setLastCheck(formatDateTime(data.lastCheck));
        } else {
          setLastCheck('');
        }
        if (data && data.graduation_status) {
          setCurrentStatus(data.graduation_status === 'true' ? 'Yes' : 'No');
        }
      });
    // eslint-disable-next-line
  }, [userId]);

  function formatDateTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString();
  }

  function showLogoutModal() {
    setShowModal(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    try {
      await fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      // ignore error
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(function(c) {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      if (reason === 'timeout') {
        navigate('/?session=expired');
      } else if (reason === 'back') {
        navigate('/?session=back', { replace: true });
      } else {
        navigate('/?logout=success');
      }
    }
  }

  const handleCheckStatus = async () => {
    if (!userId) {
      setCurrentStatus('Unknown');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/auth/graduation-status/${userId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentStatus(data.graduation_status === 'true' ? 'Yes' : 'No');
        setLastCheck(formatDateTime(data.lastCheck));
      } else {
        setCurrentStatus('No');
      }
    } catch {
      setCurrentStatus('Unknown');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 2000 }} />
      )}
      <div style={{
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 0 : -260,
        width: 260,
        height: '100vh',
        background: '#7a2323',
        color: 'white',
        boxShadow: sidebarOpen ? '2px 0 12px rgba(0,0,0,0.15)' : 'none',
        zIndex: 2100,
        transition: 'left 0.3s',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 40
      }}>
        <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'white', fontSize: 28, cursor: 'pointer' }} aria-label="Close Sidebar">&times;</button>
        <div style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 32, textAlign: 'center' }}>Menu</div>
        {menuItems.map(item => (
          <button
            key={item.key}
            onClick={() => {
              setSelectedMenu(item.key);
              if (item.key === 'system') {
                navigate('/system-start');
              } else if (item.key === 'delete') {
                navigate('/delete-user');
              }
            }}
            style={{
              background: selectedMenu === item.key ? '#dcd4d3' : '#a7a6a4',
              color: '#7a2323',
              fontWeight: selectedMenu === item.key ? 'bold' : 'normal',
              fontSize: 20,
              textAlign: 'left',
              padding: '16px 20px 16px 15px',
              margin: 0,
              border: 'none',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              boxShadow: selectedMenu === item.key ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              outline: selectedMenu === item.key ? '2px solid #b7a6a4' : 'none',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            <span style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid #7a2323',
              background: selectedMenu === item.key ? '#fff' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6
            }}>
              {selectedMenu === item.key && (
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#7a2323',
                  display: 'inline-block'
                }} />
              )}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#8c2225', color: 'white', display: 'flex', alignItems: 'center', height: 120, padding: '0 32px', position: 'sticky', top: 0, zIndex: 1001 }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 36, cursor: 'pointer', marginRight: 24 }}>
            <span style={{ fontWeight: 'bold', fontSize: 36 }}>&#9776;</span>
          </button>
          <img src={logo} alt="Logo" style={{ height: 100, marginRight: 18 }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 1, whiteSpace: 'nowrap' }}>İZMİR INSTITUTE OF TECHNOLOGY</div>
            <div style={{ fontSize: 18, fontStyle: 'italic', color: '#e0e0e0', marginTop: 4, whiteSpace: 'nowrap' }}>Turkey's Technology Base</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={studentIcon} alt="Student" style={{ width: 54, height: 54, objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 20, color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', position: 'sticky', top: 120, background: '#f5f5f5', zIndex: 1000 }}>CHECK STATUS</h1>
        
        {/* Main content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 400px)',
          gap: '20px'
        }}>
          <div style={{
            background: '#f0f0f0',
            borderRadius: '15px',
            padding: '20px',
            width: '50%',
            maxWidth: '500px',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ 
                fontSize: '24px', 
                color: '#333'
              }}>
                Eligibility for the graduation: {currentStatus}
              </span>
            </div>
          </div>

          <button 
            onClick={handleCheckStatus}
            style={{
              background: '#666',
              color: 'white',
              padding: '15px 30px',
              borderRadius: '25px',
              border: 'none',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#555'}
            onMouseOut={(e) => e.currentTarget.style.background = '#666'}
          >
            Check Status
            <span style={{ fontSize: '24px' }}>⟳</span>
          </button>

          <div style={{ 
            color: '#666', 
            fontSize: '14px',
            marginTop: '10px'
          }}>
            last check: {lastCheck ? lastCheck : 'Not checked yet'}
          </div>
        </div>
        
        {/* Logout Button */}
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
        </div>

        {/* Logout Modal */}
        <div className="modal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={hideLogoutModal}>Cancel</button>
              <button onClick={() => quitSystem('manual')}>Quit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 