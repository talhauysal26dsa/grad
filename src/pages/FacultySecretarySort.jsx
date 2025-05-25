import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import secretaryPng from '../assets/secretary.png';
import downloadIcon from '../assets/download.png';
import saveIcon from '../assets/save-icon.png';

const menuItems = [
  { key: 'sort', label: 'Sort the Students' },
];

function downloadDummyCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FacultySecretarySort() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('sort');
  const [departmentFiles, setDepartmentFiles] = useState([]);
  const [sortedReady, setSortedReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  // currentUser ve userName fonksiyon başında tanımlı
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';

  // Check department files on mount
  useEffect(() => {
    if (!currentUser || !currentUser.userID) {
      console.error('User not found');
      return;
    }
    async function checkDepartmentFiles() {
      try {
        const res = await fetch(`http://localhost:8080/api/auth/department-files-status?secretaryId=${currentUser.userID}`);
        if (res.ok) {
          const data = await res.json();
          setDepartmentFiles(data);
        } else {
          console.error('Failed to fetch department files status');
        }
      } catch (e) {
        console.error('Failed to fetch department files status:', e);
      }
    }
    checkDepartmentFiles();
  }, []);

  // Download department file
  async function handleDownloadDepartmentFile(departmentId, departmentName) {
    try {
      const res = await fetch(`http://localhost:8080/api/auth/department-sorted-students-csv?departmentId=${departmentId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${departmentName.replace(/\s+/g, '_').toLowerCase()}_sorted_students.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download failed!');
      }
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
  }

  async function handleDownloadSortedList() {
    const facultyId = currentUser?.faculty_facultyid;
    if (!facultyId) {
      alert('Faculty ID bulunamadı!');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/auth/faculty-sorted-students-csv?facultyId=${facultyId}`);
      if (!res.ok) {
        throw new Error('Failed to download sorted list');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sorted_students.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + error.message);
    }
  }

  async function handleDownloadTopThree() {
    const facultyId = currentUser?.faculty_facultyid;
    if (!facultyId) {
      alert('Faculty ID bulunamadı!');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/auth/faculty-sorted-students-csv?facultyId=${facultyId}`);
      if (!res.ok) {
        throw new Error('Failed to download sorted list');
      }
      const text = await res.text();
      const lines = text.split('\n');
      // Header + ilk 3 satır (varsa)
      const topThree = [lines[0], lines[1], lines[2], lines[3]].filter(Boolean).join('\n');
      const blob = new Blob([topThree], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'top_three_students.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + error.message);
    }
  }

  async function handleSort() {
    const facultyId = (currentUser && (currentUser.faculty_facultyid || currentUser.facultyId || (currentUser.faculty && (currentUser.faculty.facultyid || currentUser.faculty.id)))) || null;
    if (!facultyId) {
      alert("Faculty ID bulunamadı!");
      return;
    } else {
      try {
        // Backend'e sort isteği gönder
        const res = await fetch(`http://localhost:8080/api/auth/faculty-secretary/sort-all-students?facultyId=${facultyId}`, {
          method: 'POST'
        });
  
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Sorting failed');
        }
  
        // Başarılı ise state'i güncelle
        setSortedReady(true);
        setShowSuccessModal(true);
      } catch (error) {
        console.error('Sort error:', error);
        alert('Sorting failed: ' + error.message);
      }
    }
  
    // (İsteğe bağlı) Backend'e sort isteği (fetch) gönderebilirsin, örneğin:
    // const res = await fetch("http://localhost: 8080/api/auth/faculty-secretary/sort-all-students?facultyId=" + facultyId, { method: "POST" });
    // if (res.ok) { ... } else { ... }
  
    // (Örnek olarak) İşlem başarılı olduğunda sortedReady'yi true yapıp alert göster
    setSortedReady(true);
  }

  // Button color logic
  const allDepartmentsReady = departmentFiles.every(Boolean);
  const sortButtonActive = allDepartmentsReady;
  const sortedDownloadActive = allDepartmentsReady && sortedReady;
  const savedInSystemGreen = sortedReady;

  // Dummy CSV content for download simulation
  const dummyDepartmentCSV = 'id,name\n1,Student A\n2,Student B';

  // Pagination state
  const departmentsPerPage = 4;
  const totalPages = Math.ceil(departmentFiles.length / departmentsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const startIdx = (currentPage - 1) * departmentsPerPage;
  const endIdx = startIdx + departmentsPerPage;
  const pagedDepartments = departmentFiles.slice(startIdx, endIdx);

  // Logout logic
  function quitSystem() {
    setShowModal(false);
    let userId = null;
    try {
      userId = currentUser ? currentUser.userID : null;
    } catch {}
    // Doğru logout ve log için backend'e istek at
    if (userId) {
      fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: userId })
      }).catch(() => {});
    }
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(function(c) {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    navigate('/', { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', position: 'relative' }}>
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
            <img src={secretaryPng} alt="Profile" style={{ width: 54, height: 54, objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 20, color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', position: 'sticky', top: 120, background: '#f5f5f5', zIndex: 1000 }}>SORT THE STUDENTS</h1>
        {/* Department download rows */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, margin: '48px auto 0 auto', maxWidth: 900 }}>
          {pagedDepartments.map((dept) => (
            <div key={dept.departmentId} style={{ display: 'flex', alignItems: 'center', width: 800, gap: 24, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 12, padding: '12px 24px', fontSize: 20, width: 500, justifyContent: 'space-between', margin: '0 auto' }}>
                <span>Download the list of {dept.departmentName} (.csv)</span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: dept.hasFile ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: dept.hasFile ? 'auto' : 'none',
                    transition: 'filter 0.2s',
                  }}
                  disabled={!dept.hasFile}
                  onClick={dept.hasFile ? () => handleDownloadDepartmentFile(dept.departmentId, dept.departmentName) : undefined}
                  title={dept.hasFile ? `Download ${dept.departmentName} List` : `${dept.departmentName} file not ready`}
                >
                  <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: dept.hasFile ? 'none' : 'grayscale(1) opacity(0.6)' }} />
                </button>
              </div>
              {/* Empty right side for alignment with saved badge */}
              <div style={{ width: 210 }} />
            </div>
          ))}
        </div>
        {/* Pagination */}
        <div style={{ margin: '24px auto 32px auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, justifyContent: 'center', maxWidth: 700 }}>
          <span style={{ cursor: currentPage > 1 ? 'pointer' : 'not-allowed', color: '#888' }} onClick={() => setCurrentPage(1)}>{'<<'}</span>
          <span style={{ cursor: currentPage > 1 ? 'pointer' : 'not-allowed', color: '#888' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>{'<'}</span>
          {Array.from({ length: totalPages }, (_, i) => (
            <span
              key={i + 1}
              style={{ fontWeight: currentPage === i + 1 ? 'bold' : 'normal', color: currentPage === i + 1 ? '#7a2323' : '#888', cursor: 'pointer', padding: '0 4px' }}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </span>
          ))}
          <span style={{ cursor: currentPage < totalPages ? 'pointer' : 'not-allowed', color: '#888' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>{'>'}</span>
          <span style={{ cursor: currentPage < totalPages ? 'pointer' : 'not-allowed', color: '#888' }} onClick={() => setCurrentPage(totalPages)}>{'>>'}</span>
        </div>
        {/* Sort Button */}
        <button
          style={{
            background: sortButtonActive ? '#a82323' : '#aaa',
            color: 'white',
            border: 'none',
            borderRadius: 24,
            padding: '18px 48px',
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'serif',
            margin: '32px auto',
            cursor: sortButtonActive ? 'pointer' : 'not-allowed',
            letterSpacing: 1,
            transition: 'background 0.2s',
            display: 'block'
          }}
          disabled={!sortButtonActive}
          onClick={sortButtonActive ? handleSort : undefined}
        >
          SORT THE STUDENTS
        </button>
        {/* Sorted and Top 3 Download Buttons (always visible, but stateful) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 800, margin: '0 auto', alignItems: 'center' }}>
          {/* Sorted list row */}
          <div style={{ display: 'flex', alignItems: 'center', width: 800, gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 16, padding: '18px 24px', fontSize: 20, width: 500, justifyContent: 'space-between', marginLeft: 45 }}>
              <span>Download the sorted list of students</span>
              <button style={{ background: 'none', border: 'none', outline: 'none', padding: 0, margin: 0, cursor: sortedDownloadActive ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: sortedDownloadActive ? 'auto' : 'none', transition: 'filter 0.2s' }} disabled={!sortedDownloadActive} onClick={sortedDownloadActive ? handleDownloadSortedList : undefined}>
                <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: sortedDownloadActive ? 'none' : 'grayscale(1) opacity(0.6)' }} />
              </button>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: savedInSystemGreen ? '#2ecc40' : '#aaa',
              borderRadius: 16,
              padding: '8px 22px',
              fontWeight: 700,
              color: '#fff',
              fontSize: 22,
              fontFamily: 'serif',
              letterSpacing: 0.5,
              transition: 'background 0.2s, color 0.2s',
              minWidth: 210,
              justifyContent: 'center',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}>
              Saved in system
              <img src={saveIcon} alt="Saved" style={{ width: 26, height: 26, marginLeft: 6, filter: savedInSystemGreen ? 'none' : 'grayscale(1) opacity(0.7)' }} />
            </span>
          </div>
          {/* Top three students row */}
          <div style={{ display: 'flex', alignItems: 'center', width: 800, gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 16, padding: '18px 24px', fontSize: 20, width: 500, justifyContent: 'space-between', marginLeft: 45 }}>
              <span>Download the list of top three students</span>
              <button style={{ background: 'none', border: 'none', outline: 'none', padding: 0, margin: 0, cursor: sortedDownloadActive ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: sortedDownloadActive ? 'auto' : 'none', transition: 'filter 0.2s' }} disabled={!sortedDownloadActive} onClick={sortedDownloadActive ? handleDownloadTopThree : undefined}>
                <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: sortedDownloadActive ? 'none' : 'grayscale(1) opacity(0.6)' }} />
              </button>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: savedInSystemGreen ? '#2ecc40' : '#aaa',
              borderRadius: 16,
              padding: '8px 22px',
              fontWeight: 700,
              color: '#fff',
              fontSize: 22,
              fontFamily: 'serif',
              letterSpacing: 0.5,
              transition: 'background 0.2s, color 0.2s',
              minWidth: 210,
              justifyContent: 'center',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}>
              Saved in system
              <img src={saveIcon} alt="Saved" style={{ width: 26, height: 26, marginLeft: 6, filter: savedInSystemGreen ? 'none' : 'grayscale(1) opacity(0.7)' }} />
            </span>
          </div>
        </div>
      </div>
      {/* Logout Button */}
      <div 
        className="logout-btn" 
        onClick={() => setShowModal(true)}
        style={{ position: 'fixed', bottom: 16, right: 26, zIndex: 3000, cursor: 'pointer' }}
      >
        <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
      </div>
      {/* Logout Modal */}
      <div className="modal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
        <div className="modal-content" style={{ background: '#fff', borderRadius: 16, padding: '32px 48px 24px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', minWidth: 320, fontSize: 22, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ marginBottom: 24 }}>Are you sure you want to quit?</p>
          <div className="modal-buttons" style={{ display: 'flex', gap: 18 }}>
            <button onClick={() => setShowModal(false)} style={{ background: '#aaa', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={quitSystem} style={{ background: '#a82323', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>Quit</button>
          </div>
        </div>
      </div>
      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '36px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            minWidth: 320, fontSize: 22, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <span style={{ fontSize: 32, color: '#2ecc40', marginBottom: 16 }}>✔</span>
            <p style={{ marginBottom: 24, color: '#7a2323' }}>Sorting and saving completed!</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                background: '#a82323', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 18, fontWeight: 600, cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 