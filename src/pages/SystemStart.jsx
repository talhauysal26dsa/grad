import React, { useState } from 'react';
import logo from '../assets/logo.png';
import adminIcon from '../assets/admin-icon.png';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { key: 'system', label: 'System Start' },
  { key: 'logs', label: 'Log Records' },
  { key: 'add', label: 'Delete User' },
];

const months = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const roleOptions = [
  'Faculty Secretary',
  'Department Secretary',
  'Advisor',
  'Student Affairs',
  'Student',
  'Admin',
];

const roleMap = {
  1: 'Faculty Secretary',
  2: 'Department Secretary',
  3: 'Advisor',
  4: 'Student Affairs',
  5: 'Student',
  6: 'Admin',
};

const years = [2025,2026, 2027, 2028, 2029];

export default function SystemStart() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('system');
  const [role, setRole] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [startMonth, setStartMonth] = useState("");
  const [startDay, setStartDay] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endDay, setEndDay] = useState("");
  const [startDayError, setStartDayError] = useState('');
  const [endDayError, setEndDayError] = useState('');
  const [startYear, setStartYear] = useState(years[0]);
  const [endYear, setEndYear] = useState(years[0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const timeoutRef = React.useRef(null);

  const userName = 'Name Surname';
  const navigate = useNavigate();

  // Validasyon fonksiyonu
  function validateDay(value) {
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 31;
  }

  // Start Day değişince kontrol et
  function handleStartDayInput(e) {
    const val = e.target.value;
    if (val === '' || (Number(val) >= 1 && Number(val) <= 31 && /^\d+$/.test(val))) {
      setStartDay(val);
      if (!validateDay(val)) {
        setStartDayError('Invalid date');
      } else {
        setStartDayError('');
      }
    } else {
      // Geçersiz karakter girildiyse input'u güncelleme
      e.target.value = startDay;
    }
  }

  // End Day değişince kontrol et
  function handleEndDayInput(e) {
    const val = e.target.value;
    if (val === '' || (Number(val) >= 1 && Number(val) <= 31 && /^\d+$/.test(val))) {
      setEndDay(val);
      if (!validateDay(val)) {
        setEndDayError('Invalid date');
      } else {
        setEndDayError('');
      }
    } else {
      e.target.value = endDay;
    }
  }

  function handleStartYearChange(e) {
    const newStartYear = Number(e.target.value);
    setStartYear(newStartYear);
    if (endYear < newStartYear) {
      setEndYear(newStartYear);
    }
  }

  function handleEndYearChange(e) {
    const newEndYear = Number(e.target.value);
    if (newEndYear < startYear) {
      setEndYear(startYear);
    } else {
      setEndYear(newEndYear);
    }
  }

  const isApplyDisabled = !!startDayError || !!endDayError;

  function getDateString(year, month, day) {
    const monthNum = String(months.indexOf(month) + 1).padStart(2, '0');
    const dayNum = String(day).padStart(2, '0');
    return `${year}-${monthNum}-${dayNum}`;
  }

  async function handleApply() {
    if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay || !role) {
      setErrorMessage('Please fill in all fields!');
      setShowError(true);
      return;
    }
    const activation_date = getDateString(startYear, startMonth, startDay);
    const deactivation_date = getDateString(endYear, endMonth, endDay);
    // New logic: check if start date is before today
    const today = new Date();
    today.setHours(0,0,0,0); // ignore time
    if (new Date(activation_date) < today) {
      setErrorMessage('Start date cannot be before today!');
      setShowError(true);
      return;
    }
    if (new Date(activation_date) > new Date(deactivation_date)) {
      setErrorMessage('Start date cannot be after end date!');
      setShowError(true);
      return;
    }
    try {
      const res = await fetch('http://localhost:8080/api/roles/update-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: role,
          activation_date,
          deactivation_date
        })
      });
      if (res.ok) {
        setShowSuccess(true);
      } else {
        setErrorMessage('Update failed!');
        setShowError(true);
      }
    } catch (err) {
      setErrorMessage('Server error!');
      setShowError(true);
    }
  }

  function handleCancel() {
    setRole('');
    setShowRoleDropdown(false);
    setStartMonth("");
    setStartDay("");
    setEndMonth("");
    setEndDay("");
    setStartDayError('');
    setEndDayError('');
    setStartYear(years[0]);
    setEndYear(years[0]);
    setShowSuccess(false);
    setShowError(false);
    setErrorMessage("");
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
      if (reason === 'timeout') {
        navigate('/?session=expired');
      } else if (reason === 'back') {
        navigate('/?session=back', { replace: true });
      } else {
        navigate('/?logout=success');
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden', background: '#f5f5f5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowX: 'hidden' }}>
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          color: '#7a2323',
          border: '2px solid #7a2323',
          borderRadius: 16,
          padding: '32px 48px 24px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          minWidth: 320,
          fontSize: 22,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 24
        }}>
          <span style={{ flex: 1 }}>Dates updated successfully!</span>
          <button onClick={() => setShowSuccess(false)} style={{
            background: 'none',
            border: 'none',
            color: '#7a2323',
            fontSize: 28,
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 16,
            marginTop: -8
          }} aria-label="Kapat">×</button>
        </div>
      )}
      {showError && (
        <div style={{
          position: 'fixed',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          color: '#a00',
          border: '2px solid #a00',
          borderRadius: 16,
          padding: '32px 48px 24px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          zIndex: 9999,
          minWidth: 320,
          fontSize: 22,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 24
        }}>
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <button onClick={() => setShowError(false)} style={{
            background: 'none',
            border: 'none',
            color: '#a00',
            fontSize: 28,
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: 16,
            marginTop: -8
          }} aria-label="Kapat">×</button>
        </div>
      )}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 2000 }} />
      )}
      {/* Sidebar */}
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
              if (item.key === 'add') {
                navigate('/delete-user');
              } else if (item.key === 'logs') {
                navigate('/log-records');
              } else if (item.key === 'system') {
                navigate('/system-start');
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
              border: `2px solid #7a2323`,
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
      {/* Header */}
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
            <img src={adminIcon} alt="Admin" style={{ width: 54, height: 54, objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 20, color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </div>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem 0', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', overflowX: 'hidden' }}>
        <div style={{ width: '100vw', maxWidth: 'none', marginLeft: 0, paddingLeft: 150, height: 'calc(100vh - 120px)', overflowY: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridGap: '40px 40px', marginBottom: 32, marginLeft: 0, paddingLeft: 0, width: '100%', maxWidth: '100%', alignItems: 'flex-start', justifyItems: 'flex-start' }}>
            {/* START YEAR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, padding: '12px 40px', fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8 }}>START YEAR</div>
              <select
                value={startYear}
                onChange={handleStartYearChange}
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: '12px 40px', fontSize: 26, fontWeight: 600, fontFamily: 'serif', minWidth: 140, border: 'none', textAlign: 'center', display: 'block', margin: '0 auto' }}
              >
                {years.map(y => <option key={y} value={y} style={{ textAlign: 'left' }}>{y}</option>)}
              </select>
            </div>
            {/* START MONTH */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, padding: '12px 40px', fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8 }}>START MONTH</div>
              <select
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: 0, fontSize: 26, fontWeight: 600, fontFamily: 'serif', border: 'none', textAlign: 'center', textAlignLast: 'center', width: 250, margin: '0 auto', height: 56 }}
              >
                <option value="">-select month-</option>
                {months.map(m => <option key={m} value={m} style={{ textAlign: 'center' }}>{m}</option>)}
              </select>
            </div>
            {/* START DAY */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, padding: '12px 40px', fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8 }}>START DAY</div>
              <input
                type="number"
                min="1"
                max="31"
                value={startDay}
                onInput={handleStartDayInput}
                placeholder="-"
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: '12px 40px', fontSize: 26, fontWeight: 600, fontFamily: 'serif', border: 'none', textAlign: 'center' }}
              />
              <div style={{ minHeight: 22, color: '#a00', fontWeight: 600, fontSize: 16, marginTop: 2 }}>{startDayError}</div>
            </div>
            {/* ROLE BUTTON */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 6, height: '100%', marginTop: '-4px' }}>
              <div style={{ height: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative' }}>
                <div
                  style={{
                    background: '#bdbdbd',
                    color: '#7a2323',
                    borderRadius: 14,
                    padding: '14px 0',
                    fontSize: 22,
                    fontWeight: 600,
                    fontFamily: 'serif',
                    border: 'none',
                    marginBottom: 0,
                    textAlign: 'center',
                    width: 300,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setShowRoleDropdown(v => !v)}
                >
                  {role ? role : 'Role'} <span style={{ position: 'absolute', right: 18, top: 10, fontSize: 28 }}>▼</span>
                </div>
                {showRoleDropdown && (
                  <div style={{ background: '#fff', border: '1.5px solid #bdbdbd', borderRadius: 14, marginTop: 0, width: 300, fontSize: 22, color: '#444', fontFamily: 'serif', fontWeight: 600, overflow: 'hidden', position: 'absolute', zIndex: 10, top: 48 }}>
                    {roleOptions.map(opt => (
                      <div
                        key={opt}
                        style={{ padding: '12px 0', borderBottom: '1px solid #bdbdbd', cursor: 'pointer', background: role === opt ? '#eee' : '#fff', fontWeight: 600, fontSize: 22, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => { setRole(opt); setShowRoleDropdown(false); }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* END YEAR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, width: 280, height: 72, fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>END YEAR</div>
              <select
                value={endYear}
                onChange={handleEndYearChange}
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: '12px 40px', fontSize: 26, fontWeight: 600, fontFamily: 'serif', minWidth: 140, border: 'none', textAlign: 'center', display: 'block', margin: '0 auto' }}
              >
                {years.map(y => <option key={y} value={y} style={{ textAlign: 'left' }}>{y}</option>)}
              </select>
            </div>
            {/* END MONTH */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, width: 315, height: 72, fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>END MONTH</div>
              <select
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: 0, fontSize: 26, fontWeight: 600, fontFamily: 'serif', border: 'none', textAlign: 'center', textAlignLast: 'center', width: 250, margin: '0 auto', height: 56 }}
              >
                <option value="">-select month-</option>
                {months.map(m => <option key={m} value={m} style={{ textAlign: 'center' }}>{m}</option>)}
              </select>
            </div>
            {/* END DAY */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginLeft: -40 }}>
              <div style={{ background: '#7a2323', color: 'white', borderRadius: 28, padding: '12px 40px', fontSize: 32, fontWeight: 700, fontFamily: 'serif', marginBottom: 8, textAlign: 'center', display: 'flex',width: 258, margin: '0 auto', height: 72,  alignItems: 'center', justifyContent: 'center' }}>END DAY</div>
              <input
                type="number"
                min="1"
                max="31"
                value={endDay}
                onInput={handleEndDayInput}
                placeholder="-"
                style={{ background: '#d9d5d3', color: '#7a2323', borderRadius: 14, padding: '12px 40px', fontSize: 26, fontWeight: 600, fontFamily: 'serif', border: 'none', textAlign: 'center', marginTop: 9}}
              />
              <div style={{ minHeight: 22, color: '#a00', fontWeight: 600, fontSize: 16, marginTop: 2 }}>{endDayError}</div>
            </div>
            {/* boş hücre, grid hizası için */}
            <div />
          </div>
          {/* Butonlar en alta ve sağa sabit */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 32, padding: '0 50px 40px 0', maxWidth: '100vw', boxSizing: 'border-box', marginBottom: 0 }}>
            <button style={{ background: '#888', color: 'white', border: 'none', borderRadius: 18, padding: '18px 0', fontSize: 32, fontWeight: 700, fontFamily: 'serif', cursor: 'pointer', width: 180, textAlign: 'center' }} onClick={handleCancel}>CANCEL</button>
            <button style={{ background: isApplyDisabled ? '#ccc' : '#7a2323', color: 'white', border: 'none', borderRadius: 18, padding: '18px 0', fontSize: 32, fontWeight: 700, fontFamily: 'serif', cursor: isApplyDisabled ? 'not-allowed' : 'pointer', width: 180, textAlign: 'center' }} disabled={isApplyDisabled} onClick={handleApply}>APPLY</button>
          </div>
          <div 
            className="logout-btn" 
            onClick={showLogoutModal}
            style={{ position: 'fixed', bottom: 16, right: 26, zIndex: 3000, cursor: 'pointer' }}
          >
            <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
          </div>
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
    </div>
  );
} 