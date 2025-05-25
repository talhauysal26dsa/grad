import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import downloadpng from '../assets/download.png';
import saveIcon from '../assets/save-icon.png';
import logo from '../assets/logo.png';

const menuItems = [
  { key: 'form', label: 'Form Preparation' }
];

export default function FormPreparation() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('form');
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [qualifyMsg, setQualifyMsg] = useState('');
  const [showCounts, setShowCounts] = useState(null);
  
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';

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
    let userId = null;
    try {
      userId = currentUser ? currentUser.userID : null;
    } catch {}
    // Log kaydı ekle
    if (userId) {
      try {
        await fetch('http://localhost:8080/api/log-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, action: 'Logout' })
        });
      } catch (e) { /* ignore */ }
    }
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

  async function handleQualifyStudents() {
    setQualifyMsg('');
    if (!currentUser || !currentUser.userID) {
      setQualifyMsg('User info not found!');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/auth/advisor/qualify-students?advisorId=${currentUser.userID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const msg = await res.text();
        setQualifyMsg(msg);
        let qualifiedCount = null;
        let notQualifiedCount = null;
        if (typeof msg === 'string') {
          const match = msg.match(/Qualified: (\d+), Not qualified: (\d+)/);
          if (match) {
            qualifiedCount = match[1];
            notQualifiedCount = match[2];
          }
        }
        setShowCounts({ qualified: qualifiedCount, notQualified: notQualifiedCount });
      } else {
        const err = await res.text();
        setQualifyMsg('Error: ' + err);
      }
    } catch (e) {
      setQualifyMsg('Network error!');
    }
  }

  // CSV indirme fonksiyonu
  async function handleDownloadGraduatedStudents() {
    if (!currentUser || !currentUser.userID) {
      alert('User info not found!');
      return;
    }
    const res = await fetch(`http://localhost:8080/api/auth/graduated-students-csv?advisorId=${currentUser.userID}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graduated_students.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Download failed!');
    }
  }

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
              if (item.key === 'form') navigate('/form-preparation');
            }}
            style={{
              background: selectedMenu === item.key ? '#fff' : '#a7a6a4',
              color: selectedMenu === item.key ? '#7a2323' : '#7a2323',
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
          <div style={{ height: 100, width: 100, marginRight: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={logo} alt="IYTE Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 1, whiteSpace: 'nowrap' }}>İZMİR INSTITUTE OF TECHNOLOGY</div>
            <div style={{ fontSize: 18, fontStyle: 'italic', color: '#e0e0e0', marginTop: 4, whiteSpace: 'nowrap' }}>Turkey's Technology Base</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <span style={{ color: '#7a2323', fontSize: 24, fontWeight: 'bold' }}>
              {currentUser && currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </span>
          </div>
          <div style={{ fontSize: 20, color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', position: 'sticky', top: 120, background: '#f5f5f5', zIndex: 1000 }}>FORM PREPARATION</h1>
        
        {/* Qualify The Students Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginLeft: 40, marginRight: 40, marginTop: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 120 }}>
            <button
              style={{
                background: '#8c2225',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '12px 45px',
                fontSize: 20,
                fontWeight: '500',
                cursor: 'pointer',
                letterSpacing: '0.5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                width: '350px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
              onClick={async () => {
                await handleQualifyStudents();
                // Sonuç mesajından qualified ve not qualified sayılarını çek
                let qualifiedCount = null;
                let notQualifiedCount = null;
                if (typeof qualifyMsg === 'string') {
                  const match = qualifyMsg.match(/Qualified: (\d+), Not qualified: (\d+)/);
                  if (match) {
                    qualifiedCount = match[1];
                    notQualifiedCount = match[2];
                  }
                }
                setShowCounts({ qualified: qualifiedCount, notQualified: notQualifiedCount });
              }}
            >
              QUALIFY THE STUDENTS
            </button>
            {qualifyMsg && (
              qualifyMsg.startsWith('Error') ? (
                <div style={{ marginTop: 16, color: 'red', fontWeight: 500 }}>{qualifyMsg}</div>
              ) : (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <table style={{ borderCollapse: 'collapse', background: '#fff', color: '#222', fontSize: 16, minWidth: 350, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    <tbody>
                      {/* Qualified/Not Qualified sayıları */}
                      {showCounts && showCounts.qualified !== null && showCounts.notQualified !== null && (
                        <tr style={{ fontWeight: 600, background: '#f5f5f5' }}>
                          <td style={{ border: '1px solid #bbb', padding: '8px 18px' }}>Qualified</td>
                          <td style={{ border: '1px solid #bbb', padding: '8px 18px' }}>{showCounts.qualified}</td>
                        </tr>
                      )}
                      {showCounts && showCounts.qualified !== null && showCounts.notQualified !== null && (
                        <tr style={{ fontWeight: 600, background: '#f5f5f5' }}>
                          <td style={{ border: '1px solid #bbb', padding: '8px 18px' }}>Not Qualified</td>
                          <td style={{ border: '1px solid #bbb', padding: '8px 18px' }}>{showCounts.notQualified}</td>
                        </tr>
                      )}
                      {/* Diğer detaylar (qualifiedMsg) */}
                      {qualifyMsg.split('\n').map((line, idx) => {
                        // Qualified/Not Qualified satırlarını tekrar yazma
                        if (/Qualified: \d+, Not qualified: \d+/.test(line)) return null;
                        if (!line.trim()) return null;
                        return (
                          <tr key={idx}>
                            <td colSpan={2} style={{ border: '1px solid #eee', padding: '7px 14px', color: '#444', background: '#fafafa' }}>{line}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            <button style={{
              background: '#4a4a4a',
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '12px 45px',
              fontSize: 20,
              fontWeight: '500',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              width: '350px',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}>
              GENERATE FORM
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <button
                style={{
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 50,
                  padding: '12px 32px',
                  fontSize: 18,
                  fontWeight: '500',
                  cursor: qualifyMsg.includes('Qualified') ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: '300px',
                  justifyContent: 'space-between',
                  opacity: qualifyMsg.includes('Qualified') ? 1 : 0.5
                }}
                onClick={handleDownloadGraduatedStudents}
                disabled={!qualifyMsg.includes('Qualified')}
              >
                List of all students (.csv)
                <img src={downloadpng} alt="download" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              </button>
              <div style={{ paddingRight: 8 }}>
                <button style={{
                  background: qualifyMsg.includes('Qualified') ? '#4caf50' : '#4a4a4a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap'
                }}>
                  Saved in system <img src={saveIcon} alt="save" style={{ width: '18px', height: '18px', marginLeft: 4 }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 60 }}>
              <button
                style={{
                  background: '#eaeaea',
                  color: '#333',
                  border: 'none',
                  borderRadius: 50,
                  padding: '12px 32px',
                  fontSize: 18,
                  fontWeight: '500',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: '300px',
                  justifyContent: 'space-between',
                  opacity: 0.5
                }}
                disabled={true}
              >
                Graduation Form (With Transcripts)(.csv)
                <img src={downloadpng} alt="download" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              </button>
              <div style={{ paddingRight: 8 }}>
                <button style={{
                  background: '#4a4a4a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap'
                }}>
                  Saved in system <img src={saveIcon} alt="save" style={{ width: '18px', height: '18px', marginLeft: 4 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
          style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 3000, cursor: 'pointer' }}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
        </div>

        {/* Logout Modal */}
        <div className="modal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'white', padding: '24px', borderRadius: 12, minWidth: 300 }}>
            <p style={{ fontSize: 18, marginBottom: 20 }}>Are you sure you want to quit?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button 
                onClick={hideLogoutModal}
                style={{ padding: '8px 24px', background: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => quitSystem('manual')}
                style={{ padding: '8px 24px', background: '#7a2323', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 