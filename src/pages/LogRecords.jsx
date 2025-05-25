import React, { useState, useRef, useEffect } from 'react';
import logo from '../assets/logo.png';
import adminIcon from '../assets/admin-icon.png';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { key: 'system', label: 'System Start' },
  { key: 'logs', label: 'Log Records' },
  { key: 'add', label: 'Delete User' },
];

export default function LogRecords() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('logs');
  const [showModal, setShowModal] = useState(false);
  const timeoutRef = React.useRef(null);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [sortOption, setSortOption] = useState("date-desc");
  const [logData, setLogData] = useState([]);
  const [showFilterTypePopup, setShowFilterTypePopup] = useState(false);
  const [filterDateError, setFilterDateError] = useState("");
  const [showActionFilterPopup, setShowActionFilterPopup] = useState(false);
  const [selectedActionFilter, setSelectedActionFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const userName = 'Name Surname';
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:8080/api/log-records')
      .then(res => res.json())
      .then(data => setLogData(data))
      .catch(() => setLogData([]));
  }, []);

  const [visibleRows, setVisibleRows] = useState(3);
  const tableContainerRef = useRef(null);

  // Sonsuz scroll: scroll edince 3'er 3'er yeni satır gelsin
  const handleTableScroll = () => {
    const container = tableContainerRef.current;
    if (!container) return;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
      setVisibleRows(v => (v < logData.length ? Math.min(v + 3, logData.length) : v));
    }
  };

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

  const handleFilterClick = () => setShowFilterTypePopup(true);

  function handleFilterTypeSelect(type) {
    setShowFilterTypePopup(false);
    if (type === 'date') setShowFilterPopup(true);
    if (type === 'role') setShowActionFilterPopup(true);
  }

  const handleFilterClose = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterDateError("");
    setShowFilterPopup(false);
  };
  const handleFilterApply = () => {
    // End Date, Start Date'den önce olamaz
    if (filterStartDate && filterEndDate && filterEndDate < filterStartDate) {
      setFilterDateError("End date cannot be before start date.");
      return;
    }
    setFilterDateError("");
    setShowFilterPopup(false);
  };

  const handleSortClick = () => setShowSortPopup(true);
  const handleSortClose = () => {
    setSortOption("");
    setShowSortPopup(false);
  };
  const handleSortApply = () => {
    setShowSortPopup(false);
  };

  // Bugünün tarihini yyyy-mm-dd formatında al
  const todayStr = new Date().toISOString().split('T')[0];

  // Sıralama ve filtreleme fonksiyonu
  function getFilteredAndSortedLogData() {
    let filtered = [...logData];
    if (searchValue) {
      filtered = filtered.filter(row => (row.email || "").toLowerCase().includes(searchValue.toLowerCase()));
    }
    if (filterStartDate) {
      // Start date: include all logs from this date 00:00:00
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(row => row.dateTime && new Date(row.dateTime) >= start);
    }
    if (filterEndDate) {
      // End date: include all logs up to this date 23:59:59
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(row => row.dateTime && new Date(row.dateTime) <= end);
    }
    if (selectedActionFilter) {
      filtered = filtered.filter(row => (row.actionTaken || "").toLowerCase() === selectedActionFilter.toLowerCase());
    }
    if (sortOption === "date-desc") {
      filtered.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    } else if (sortOption === "date-asc") {
      filtered.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    } else if (sortOption === "mail-az") {
      filtered.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    } else if (sortOption === "mail-za") {
      filtered.sort((a, b) => (b.email || "").localeCompare(a.email || ""));
    }
    return filtered;
  }

  function convertLogsToCSV(logs) {
    if (!logs.length) return '';
    const headers = [
      'Date and Time',
      'Name',
      'Middle Name',
      'Surname',
      'User Mail',
      'User Role',
      'Action Taken'
    ];
    const rows = logs.map(row => [
      row.dateTime ? new Date(row.dateTime).toLocaleString() : '',
      row.name || '',
      row.middleName || '',
      row.surname || '',
      row.email || '',
      row.role || '',
      row.actionTaken || ''
    ]);
    return [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');
  }

  function handleDownloadLog() {
    const logs = getFilteredAndSortedLogData();
    const csv = convertLogsToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_records.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ overflow: 'hidden', background: '#f5f5f5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowX: 'hidden' }}>
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
              if (item.key === 'system') {
                navigate('/system-start');
              } else if (item.key === 'add') {
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
      <div style={{ flex: 1, width: '100%', overflowX: 'hidden', height: '100vh', paddingBottom:0 }}>
        <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
          <h1 style={{
            color: '#7a2323',
            textAlign: 'left',
            marginLeft: 40,
            fontSize: 40,
            fontFamily: 'serif',
            fontWeight: 400,
            transition: 'margin-left 0.3s',
            position: 'sticky',
            top: 5,
            background: '#f5f5f5',
            zIndex: 1000
          }}>LOG RECORDS</h1>
          {/* Top bar: Search and Sort/Filter buttons */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16, marginTop: 0, paddingRight: 120 }}>
            <form style={{ display: 'flex', alignItems: 'center', gap: 12 }} onSubmit={e => e.preventDefault()}>
              <input
                type="text"
                placeholder="search by mail…"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                style={{ fontSize: 28, borderRadius: 40, border: '2px solid #aaa', padding: '6px 24px', width: 320, background: '#bdbdbd', color: '#444', outline: 'none', fontFamily: 'serif' }}
              />
              <button type="submit" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 28, color: '#444', marginLeft: -36 }}>
                <span role="img" aria-label="search">🔍</span>
              </button>
            </form>
            <div style={{ display: 'flex', gap: 18, marginLeft: 18 }}>
              <button 
                onClick={handleSortClick}
                style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 16, padding: '12px 36px', fontSize: 20, fontWeight: 700, fontFamily: 'serif', cursor: 'pointer', marginRight: 8 }}
              >
                SORT BY
              </button>
              <button 
                onClick={handleFilterClick}
                style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 16, padding: '12px 36px', fontSize: 20, fontWeight: 700, fontFamily: 'serif', cursor: 'pointer' }}
              >
                FILTER BY
              </button>
            </div>
          </div>
          {/* Table */}
          <div style={{ margin: '0 auto 32px auto', maxWidth: 1400, width: '100%', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden', maxHeight: 390, overflowY: 'auto' }}>
            <table style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 22, background: 'transparent', tableLayout: 'fixed' }}>
              <thead style={{ background: '#d9d5d3', position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>Date and Time</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>Name</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>Middle Name</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>Surname</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>User Mail</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>User Role</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', textAlign: 'left', fontWeight: 700, fontSize: 22 }}>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedLogData().map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.dateTime ? new Date(row.dateTime).toLocaleString() : ''}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.name}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.middleName}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.surname}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.email}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.role}</td>
                    <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{row.actionTaken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Download Log Button */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 16, padding: '16px 48px', fontSize: 22, fontWeight: 700, fontFamily: 'serif', cursor: 'pointer', marginRight: 110 }} onClick={handleDownloadLog}>DOWNLOAD LOG</button>
          </div>
        </div>
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
          style={{ position: 'fixed', bottom: 16, right: 26, zIndex: 3000, cursor: 'pointer' }}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
        </div>
        {/* Logout confirmation modal (diğer sayfalarla aynı) */}
        <div className="modal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={hideLogoutModal}>Cancel</button>
              <button onClick={() => quitSystem('manual')}>Quit</button>
            </div>
          </div>
        </div>
        {showFilterPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '400px',
              position: 'relative'
            }}>
              <button
                onClick={handleFilterClose}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
              <h2 style={{
                color: '#7a2323',
                fontSize: 28,
                fontWeight: 400,
                fontFamily: 'serif',
                marginBottom: 24,
                textAlign: 'center'
              }}>Filter by Date</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 18, color: '#444' }}>Start Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    max={todayStr}
                    onChange={e => {
                      setFilterStartDate(e.target.value);
                      // End Date, Start Date'den önce ise sıfırla
                      if (filterEndDate && e.target.value && filterEndDate < e.target.value) {
                        setFilterEndDate("");
                      }
                      setFilterDateError("");
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 18,
                      border: '2px solid #aaa',
                      borderRadius: 8,
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 18, color: '#444' }}>End Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    min={filterStartDate || undefined}
                    max={todayStr}
                    disabled={!filterStartDate}
                    onChange={e => {
                      setFilterEndDate(e.target.value);
                      setFilterDateError("");
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 18,
                      border: '2px solid #aaa',
                      borderRadius: 8,
                      outline: 'none',
                      background: !filterStartDate ? '#eee' : 'white',
                      color: !filterStartDate ? '#aaa' : '#444'
                    }}
                  />
                </div>
                {filterDateError && (
                  <div style={{ color: '#a00', fontSize: 16, marginTop: 2, fontWeight: 600 }}>{filterDateError}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    onClick={handleFilterClose}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#f0f0f0',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#444'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFilterApply}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#7a2323',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showSortPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '400px',
              position: 'relative'
            }}>
              <button
                onClick={handleSortClose}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
              <h2 style={{
                color: '#7a2323',
                fontSize: 28,
                fontWeight: 400,
                fontFamily: 'serif',
                marginBottom: 24,
                textAlign: 'center'
              }}>Sort by</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="sortOption" value="date-desc" checked={sortOption === 'date-desc'} onChange={() => setSortOption('date-desc')} />
                  Date and Time: Latest to earliest
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="sortOption" value="date-asc" checked={sortOption === 'date-asc'} onChange={() => setSortOption('date-asc')} />
                  Date and Time: Earliest to latest
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="sortOption" value="mail-az" checked={sortOption === 'mail-az'} onChange={() => setSortOption('mail-az')} />
                  User Mail: A-Z
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="sortOption" value="mail-za" checked={sortOption === 'mail-za'} onChange={() => setSortOption('mail-za')} />
                  User Mail: Z-A
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
                  <button
                    onClick={handleSortClose}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#f0f0f0',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#444'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSortApply}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#7a2323',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'white'
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showFilterTypePopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '400px',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowFilterTypePopup(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
              <h2 style={{
                color: '#7a2323',
                fontSize: 28,
                fontWeight: 400,
                fontFamily: 'serif',
                marginBottom: 24,
                textAlign: 'center'
              }}>Filter by</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <button
                  onClick={() => handleFilterTypeSelect('date')}
                  style={{ padding: '14px 0', fontSize: 20, background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#7a2323', fontWeight: 600 }}
                >
                  Filter by Date
                </button>
                <button
                  onClick={() => handleFilterTypeSelect('role')}
                  style={{ padding: '14px 0', fontSize: 20, background: '#f0f0f0', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#7a2323', fontWeight: 600 }}
                >
                  Filter by Action
                </button>
              </div>
            </div>
          </div>
        )}
        {showActionFilterPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '32px',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '400px',
              position: 'relative'
            }}>
              <button
                onClick={() => { setShowActionFilterPopup(false); setSelectedActionFilter(""); }}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
              <h2 style={{
                color: '#7a2323',
                fontSize: 28,
                fontWeight: 400,
                fontFamily: 'serif',
                marginBottom: 24,
                textAlign: 'center'
              }}>Filter by Action</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="actionFilter" value="Login" checked={selectedActionFilter === 'Login'} onChange={() => setSelectedActionFilter('Login')} />
                  Login
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="actionFilter" value="Logout" checked={selectedActionFilter === 'Logout'} onChange={() => setSelectedActionFilter('Logout')} />
                  Logout
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, cursor: 'pointer' }}>
                  <input type="radio" name="actionFilter" value="Register" checked={selectedActionFilter === 'Register'} onChange={() => setSelectedActionFilter('Register')} />
                  Register
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
                  <button
                    onClick={() => { setShowActionFilterPopup(false); setSelectedActionFilter(""); }}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#f0f0f0',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#444'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowActionFilterPopup(false)}
                    style={{
                      padding: '12px 24px',
                      fontSize: 18,
                      background: '#7a2323',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'white'
                    }}
                    disabled={!selectedActionFilter}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 