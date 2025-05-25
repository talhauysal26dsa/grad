import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import secretaryPng from '../assets/secretary.png';
import uploadIcon from '../assets/upload-icon.png';
import downloadIcon from '../assets/download.png';
import saveIcon from '../assets/save-icon.png';
import Papa from 'papaparse';

const menuItems = [
  { key: 'system', label: 'Import Transcript' },
  { key: 'logs', label: 'Import Curriculum' },
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

export default function DepartmentSecretarySort() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('sort');
  const [sortedReady, setSortedReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fallFileName, setFallFileName] = useState('');
  const [summerFileName, setSummerFileName] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [advisorFileList, setAdvisorFileList] = useState([]);
  const [lastViewedCsv, setLastViewedCsv] = useState(null);
  const [sortedStudents, setSortedStudents] = useState([]);
  const navigate = useNavigate();
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';
  const fileInputRefFall = useRef();
  const fileInputRefSummer = useRef();

  function handleBrowseFall() {
    fileInputRefFall.current.click();
  }
  function handleBrowseSummer() {
    fileInputRefSummer.current.click();
  }

  // Success modal trigger for file upload
  function handleFileInputChange(e, type) {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      if (!isCSV) {
        setErrorMessage('The format is incorrect. Please upload a .csv file.');
        setShowErrorModal(true);
        e.target.value = '';
        return;
      }
      if (type === 'fall') setFallFileName(file.name);
      if (type === 'summer') setSummerFileName(file.name);
      setShowSuccessModal(true);
    }
  }

  // Sıralı listeyi backend'e kaydet
  async function saveSortedStudentsToBackend(sortedListCsv, listType) {
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {}
    const departmentId =
      (currentUser && (currentUser.department_departmentid ||
                       currentUser.departmentId ||
                       (currentUser.department && (currentUser.department.departmentid || currentUser.department.id)))) || null;
    if (!departmentId) {
      alert('Department ID not found!');
      return;
    }
    try {
      const res = await fetch('http://localhost:8080/api/auth/save-sorted-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          csv: sortedListCsv,
          filename: listType
        })
      });
      if (!res.ok) {
        const err = await res.text();
        alert('Backend error: ' + err);
      }
    } catch (e) {
      alert('API failed: ' + e.message);
    }
  }

  // CSV parse ve sıralama fonksiyonu, sıralı diziyi döndürsün
  function parseAndSortCsv(csvText) {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    let students = parsed.data.map(row => ({
      studentid: row['Student Number'],
      gpa: row['GPA'] ? parseFloat(row['GPA']) : null,
      termCount: row['Term Count'] ? parseInt(row['Term Count']) : null
    })).filter(s => s.studentid);
    // Sıralama kuralı:
    // 1. Term Count <= 8 olanlar (sadece GPA'ya göre azalan)
    // 2. Term Count > 8 olanlar (önce termCount artan, sonra GPA azalan)
    const groupA = students.filter(s => s.termCount !== null && s.termCount <= 8);
    const groupB = students.filter(s => s.termCount !== null && s.termCount > 8);
    groupA.sort((a, b) => (b.gpa || 0) - (a.gpa || 0));
    groupB.sort((a, b) => {
      if (a.termCount !== b.termCount) return a.termCount - b.termCount;
      return (b.gpa || 0) - (a.gpa || 0);
    });
    return [...groupA, ...groupB];
  }

  async function handleSort() {
    let csvToSort = lastViewedCsv;
    // Eğer lastViewedCsv yoksa, advisorFileList içindeki ilk hasFile:true olan advisor'ın dosyasını otomatik çek
    if (!csvToSort && advisorFileList && advisorFileList.some(a => a.hasFile)) {
      const firstAdvisor = advisorFileList.find(a => a.hasFile);
      if (firstAdvisor) {
        const res = await fetch(`http://localhost:8080/api/auth/graduated-students-csv?advisorId=${firstAdvisor.userID}`);
        if (res.ok) {
          csvToSort = await res.text();
          setLastViewedCsv(csvToSort);
        } else {
          alert('Advisor CSV file not found!');
          return;
        }
      }
    }
    if (csvToSort) {
      const sorted = parseAndSortCsv(csvToSort);
      setSortedStudents(sorted);
      setSortedReady(true);
      // Tüm sıralı listeyi kaydet
      const header = 'Student Number,GPA,Term Count\n';
      const rows = sorted.map(s => `${s.studentid},${s.gpa != null ? s.gpa : ''},${s.termCount != null ? s.termCount : ''}`).join('\n');
      const csv = header + rows;
      saveSortedStudentsToBackend(csv, 'sorted_students.csv');
      // Top 3'ü de kaydet
      const top3 = sorted.slice(0, 3);
      const top3Rows = top3.map(s => `${s.studentid},${s.gpa != null ? s.gpa : ''},${s.termCount != null ? s.termCount : ''}`).join('\n');
      const top3csv = header + top3Rows;
      saveSortedStudentsToBackend(top3csv, 'top_three_students.csv');
    }
  }

  // Logout logic
  async function quitSystem(reason = 'manual') {
    setShowModal(false);
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

  useEffect(() => {
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {}
    if (currentUser && currentUser.userID) {
      fetch(`http://localhost:8080/api/auth/department-advisors-files?secretaryId=${currentUser.userID}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAdvisorFileList(data));
    }
  }, []);

  // Advisor download butonları için eski kodu şununla değiştir:
  {advisorFileList.map((advisor, idx) => (
    <div key={advisor.userID} style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 12, padding: '12px 24px', fontSize: 18, width: 400, justifyContent: 'space-between', margin: '0 auto' }}>
      <span>Download the list of {advisor.name} (.csv)</span>
      <button
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          cursor: advisor.hasFile ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: advisor.hasFile ? 'auto' : 'none',
          transition: 'filter 0.2s',
        }}
        disabled={!advisor.hasFile}
        onClick={advisor.hasFile ? () => handleDownloadAdvisorGraduatedStudents(advisor.userID) : undefined}
        title={advisor.hasFile ? `Download ${advisor.name} List` : `${advisor.name} file not ready`}
      >
        <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: advisor.hasFile ? 'none' : 'grayscale(1) opacity(0.6)' }} />
      </button>
    </div>
  ))}

  // Dosya indirme fonksiyonu
  async function handleDownloadAdvisorGraduatedStudents(advisorId) {
    const res = await fetch(`http://localhost:8080/api/auth/graduated-students-csv?advisorId=${advisorId}`);
    if (res.ok) {
      const blob = await res.blob();
      // CSV'yi oku ve state'e yaz
      const text = await blob.text();
      setLastViewedCsv(text);
      // Parse ve sıralama fonksiyonunu çağır
      parseAndSortCsv(text);
      // İndirme işlemi
      const url = window.URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
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

  // Sort butonu aktiflik kontrolü: en az bir advisor dosyası varsa aktif
  const sortButtonActive = advisorFileList && advisorFileList.some(a => a.hasFile);

  // Download sorted students fonksiyonu (sıralı listeyi indir)
  function handleDownloadSortedStudents() {
    if (!sortedStudents.length) return;
    const header = 'Student Number,GPA,Term Count\n';
    const rows = sortedStudents.map(s => `${s.studentid},${s.gpa != null ? s.gpa : ''},${s.termCount != null ? s.termCount : ''}`).join('\n');
    const csv = header + rows;
    downloadDummyCSV('sorted_students.csv', csv);
  }

  // Download top 3 students fonksiyonu
  function handleDownloadTopThreeStudents() {
    if (!sortedStudents.length) return;
    const header = 'Student Number,GPA,Term Count\n';
    const top3 = sortedStudents.slice(0, 3);
    const rows = top3.map(s => `${s.studentid},${s.gpa != null ? s.gpa : ''},${s.termCount != null ? s.termCount : ''}`).join('\n');
    const csv = header + rows;
    downloadDummyCSV('top_three_students.csv', csv);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', position: 'relative', paddingBottom: 0, marginBottom: 0 }}>
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
              if (item.key === 'system') navigate('/import-transcript');
              if (item.key === 'logs') navigate('/import-curriculum');
              if (item.key === 'sort') navigate('/department-secretary-sort');
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
      <div style={{ padding: '2rem 2rem 0 2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, marginBottom: 24 }}>SORT THE STUDENTS</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 40, margin: '48px auto 0 auto', maxWidth: 1200, minHeight: 320, background: 'transparent' }}>
          {/* Left column: Upload boxes stacked vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, maxWidth: 520, marginTop: -16 }}>
            <div style={{ border: '2px solid #333', borderRadius: 12, background: '#fff', width: 520, minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ color: '#7a2323', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Upload Prior Fall Graduations</div>
              <img src={uploadIcon} alt="Upload" style={{ width: 48, height: 48, marginBottom: 8 }} />
              <button onClick={handleBrowseFall} style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 24, padding: '12px 38px', fontSize: 18, fontWeight: 700, fontFamily: 'serif', marginBottom: 10, cursor: 'pointer', letterSpacing: 1 }}>BROWSE</button>
              <input type="file" accept=".csv" ref={fileInputRefFall} style={{ display: 'none' }} onChange={e => handleFileInputChange(e, 'fall')} />
              {fallFileName && (
                <div style={{ fontSize: 15, marginTop: 8, wordBreak: 'break-all' }}>
                  <span style={{ color: '#444' }}>Uploaded file: {fallFileName}</span>
                </div>
              )}
              <div style={{ color: '#444', fontSize: 16, marginTop: 6 }}>Supported Format .csv</div>
            </div>
            <div style={{ border: '2px solid #333', borderRadius: 12, background: '#fff', width: 520, minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ color: '#7a2323', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Upload Prior Summer Graduations</div>
              <img src={uploadIcon} alt="Upload" style={{ width: 48, height: 48, marginBottom: 8 }} />
              <button onClick={handleBrowseSummer} style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 24, padding: '12px 38px', fontSize: 18, fontWeight: 700, fontFamily: 'serif', marginBottom: 10, cursor: 'pointer', letterSpacing: 1 }}>BROWSE</button>
              <input type="file" accept=".csv" ref={fileInputRefSummer} style={{ display: 'none' }} onChange={e => handleFileInputChange(e, 'summer')} />
              {summerFileName && (
                <div style={{ fontSize: 15, marginTop: 8, wordBreak: 'break-all' }}>
                  <span style={{ color: '#444' }}>Uploaded file: {summerFileName}</span>
                </div>
              )}
              <div style={{ color: '#444', fontSize: 16, marginTop: 6 }}>Supported Format .csv</div>
            </div>
          </div>
          {/* Right column: Advisor download rows */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', marginTop: -32 }}>
            {advisorFileList && advisorFileList.length > 0 ? (
              <>
                {advisorFileList.map((advisor) => (
                  <div key={advisor.userID} style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 12, padding: '12px 24px', fontSize: 18, width: 400, justifyContent: 'space-between', margin: '0 auto' }}>
                    <span>Download the list of {advisor.name} (.csv)</span>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        padding: 0,
                        margin: 0,
                        cursor: advisor.hasFile ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: advisor.hasFile ? 'auto' : 'none',
                        transition: 'filter 0.2s',
                      }}
                      disabled={!advisor.hasFile}
                      onClick={advisor.hasFile ? () => handleDownloadAdvisorGraduatedStudents(advisor.userID) : undefined}
                      title={advisor.hasFile ? `Download ${advisor.name} List` : `${advisor.name} file not ready`}
                    >
                      <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: advisor.hasFile ? 'none' : 'grayscale(1) opacity(0.6)' }} />
                    </button>
                  </div>
                ))}
                {/* SORT THE STUDENTS butonu - sadece bir kez, advisor listesinin altına */}
                <button
                  style={{
                    background: sortButtonActive ? '#a82323' : '#a7a6a4',
                    color: 'white',
                    border: 'none',
                    borderRadius: 24,
                    padding: '18px 0',
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: 'serif',
                    margin: '32px auto 0 auto',
                    cursor: sortButtonActive ? 'pointer' : 'not-allowed',
                    letterSpacing: 1,
                    width: 400,
                    display: 'block',
                    textAlign: 'center',
                  }}
                  disabled={!sortButtonActive}
                  onClick={sortButtonActive ? handleSort : undefined}
                >
                  SORT THE STUDENTS
                </button>
              </>
            ) : (
              <div style={{ color: '#888', fontSize: 18, margin: '24px 0' }}>No advisors found.</div>
            )}

            {/* --- Eski butonlar ve etiketler --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 400, marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 12, padding: '12px 24px', fontSize: 18, width: 400, justifyContent: 'space-between' }}>
                <span>Download the sorted list of students</span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: sortedReady ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: sortedReady ? 'auto' : 'none',
                    transition: 'filter 0.2s',
                  }}
                  disabled={!sortedReady}
                  onClick={sortedReady ? handleDownloadSortedStudents : undefined}
                >
                  <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: sortedReady ? 'none' : 'grayscale(1) opacity(0.6)' }} />
                </button>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: sortedReady ? '#2ecc40' : '#aaa',
                borderRadius: 12,
                padding: '6px 14px',
                fontWeight: 700,
                color: '#fff',
                fontSize: 16,
                fontFamily: 'serif',
                letterSpacing: 0.5,
                transition: 'background 0.2s, color 0.2s',
                minWidth: 120,
                justifyContent: 'center',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
              }}>
                Saved in system
                <img src={saveIcon} alt="Saved" style={{ width: 18, height: 18, marginLeft: 4, filter: sortedReady ? 'none' : 'grayscale(1) opacity(0.7)' }} />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', background: '#ececec', borderRadius: 12, padding: '12px 24px', fontSize: 18, width: 400, justifyContent: 'space-between' }}>
                <span>Download the list of top three students</span>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: sortedReady ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: sortedReady ? 'auto' : 'none',
                    transition: 'filter 0.2s',
                  }}
                  disabled={!sortedReady}
                  onClick={sortedReady ? handleDownloadTopThreeStudents : undefined}
                >
                  <img src={downloadIcon} alt="Download" style={{ width: 22, height: 22, filter: sortedReady ? 'none' : 'grayscale(1) opacity(0.6)' }} />
                </button>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: sortedReady ? '#2ecc40' : '#aaa',
                borderRadius: 12,
                padding: '6px 14px',
                fontWeight: 700,
                color: '#fff',
                fontSize: 16,
                fontFamily: 'serif',
                letterSpacing: 0.5,
                transition: 'background 0.2s, color 0.2s',
                minWidth: 120,
                justifyContent: 'center',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
              }}>
                Saved in system
                <img src={saveIcon} alt="Saved" style={{ width: 18, height: 18, marginLeft: 4, filter: sortedReady ? 'none' : 'grayscale(1) opacity(0.7)' }} />
              </span>
            </div>
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
        <div className="modal-content" style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 300 }}>
          <p style={{ fontSize: 18, marginBottom: 20 }}>Are you sure you want to quit?</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button 
              onClick={() => setShowModal(false)}
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
      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 48px 24px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', minWidth: 320, fontSize: 22, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button onClick={() => setShowSuccessModal(false)} style={{ position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#222', cursor: 'pointer' }}>&times;</button>
            <div style={{ background: '#2ecc40', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#2ecc40" /><polyline points="14,26 22,34 34,16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ color: '#2ecc40', fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Success!</div>
            <div style={{ color: '#222', fontSize: 18, marginBottom: 24, textAlign: 'center' }}>File has been successfully uploaded.</div>
            <button onClick={() => setShowSuccessModal(false)} style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}
      {/* Error Modal */}
      {showErrorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 48px 24px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', minWidth: 320, fontSize: 22, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button onClick={() => setShowErrorModal(false)} style={{ position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', fontSize: 28, color: '#222', cursor: 'pointer' }}>&times;</button>
            <div style={{ background: '#e74c3c', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#e74c3c" /><line x1="16" y1="16" x2="32" y2="32" stroke="#fff" strokeWidth="4" strokeLinecap="round" /><line x1="32" y1="16" x2="16" y2="32" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
            </div>
            <div style={{ color: '#e74c3c', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>Format Error</div>
            <div style={{ color: '#222', fontSize: 17, marginBottom: 24, textAlign: 'center' }}>{errorMessage}</div>
            <button onClick={() => setShowErrorModal(false)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
} 