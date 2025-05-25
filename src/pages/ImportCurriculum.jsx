import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import logo from '../assets/logo.png';
import secretaryPng from '../assets/secretary.png';
import uploadIcon from '../assets/upload-icon.png';
import saveIcon from '../assets/save-icon.png';

const menuItems = [
  { key: 'system', label: 'Import Transcript' },
  { key: 'logs', label: 'Import Curriculum' },
  { key: 'sort', label: 'Sort the Students' },
];

export default function ImportCurriculum() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('logs');
  const navigate = useNavigate();
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';
  const timeoutRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();
  const [imported, setImported] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState("");

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setImported(false);

      // Check zip file contents for PDF curriculum files
      const zip = new JSZip();
      const files = [];
      const invalidFiles = [];
      try {
        const loadedZip = await zip.loadAsync(file);
        loadedZip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && zipEntry.name.toLowerCase().endsWith('.pdf')) {
            // Check if the PDF file follows the curriculum naming convention
            const fileName = zipEntry.name.toLowerCase();
            const isValidCurriculumFile = fileName.includes('_curriculum.pdf') && 
                                        fileName.split('_curriculum.pdf')[0].length > 0 &&
                                        fileName.endsWith('_curriculum.pdf');
            
            if (isValidCurriculumFile) {
              files.push(zipEntry.name);
            } else {
              invalidFiles.push(zipEntry.name);
            }
          }
        });
        
        // Show error if there are invalid files or no valid curriculum files
        if (invalidFiles.length > 0) {
          setErrorPopupMessage(`Invalid curriculum file(s) found: ${invalidFiles.join(', ')}. Each PDF should be named like "dept_curriculum.pdf" (e.g., "ceng_curriculum.pdf").`);
          setShowErrorPopup(true);
          setSelectedFile(null);
          setUploadedFiles([]);
          return;
        }
        
        if (files.length === 0) {
          setErrorPopupMessage('No valid curriculum PDF files found in the ZIP archive. Each PDF should be named like "dept_curriculum.pdf" (e.g., "ceng_curriculum.pdf").');
          setShowErrorPopup(true);
          setSelectedFile(null);
          setUploadedFiles([]);
          return;
        }
        
        setUploadedFiles(files);
      } catch (err) {
        setUploadedFiles([]);
        setErrorPopupMessage('Zip file could not be read!');
        setShowErrorPopup(true);
      }
    } else {
      setSelectedFile(null);
      setUploadedFiles([]);
      setImported(false);
      setErrorPopupMessage('Please select a .zip file!');
      setShowErrorPopup(true);
    }
  };

  function handleBrowseClick() {
    fileInputRef.current.click();
  }

  async function handleImport() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:8080/api/curriculum/upload-zip', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      if (response.status === 200) {
        setImported(true);
        setUploadedFiles(response.data.files || []);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error.response?.data || 'Error uploading curriculum files. Please try again.';
      if (msg === 'No curriculum files found in the uploaded zip.') {
        setErrorPopupMessage(msg);
        setShowErrorPopup(true);
      } else {
        alert(msg);
      }
      setImported(false);
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
      <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', position: 'sticky', top: 120, zIndex: 1000 }}>IMPORT CURRICULUM</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: 0, margin: '48px auto 0 auto', maxWidth: 700, height: 320, background: 'transparent' }}>
          <div style={{ flex: 2, border: '2px solid #333', borderRight: '1px solid #333', borderRadius: '12px 0 0 12px', background: '#fff', height: '%100', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
            <img src={uploadIcon} alt="Upload" style={{ width: 64, height: 64, marginBottom: 16 }} />
            <button onClick={handleBrowseClick} style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 24, padding: '12px 38px', fontSize: 24, fontWeight: 700, fontFamily: 'serif', marginBottom: 10, cursor: 'pointer', letterSpacing: 1 }}>BROWSE</button>
            <input type="file" accept=".zip" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ color: '#444', fontSize: 18, marginTop: 6 }}>Upload a <b>.zip</b> file containing PDF curriculum files</div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 16, fontStyle: 'italic', maxWidth: 400, textAlign: 'center' }}>
              Each PDF should be named like "dept_curriculum.pdf" (e.g., "ceng_curriculum.pdf"). The system will parse the PDFs and create CSV files automatically.
            </div>
          </div>
          <div style={{ flex: 1.2, border: '2px solid #333', borderLeft: '1px solid #333', borderRadius: '0 12px 12px 0', background: '#d9d5d3', height: '%100', padding: '24px 18px', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 12, color: '#444' }}>Uploaded Files</div>
            <div style={{ fontSize: 16, color: '#333', fontFamily: 'monospace', overflowY: 'auto', maxHeight: 220, minHeight: 40, width: '100%', paddingRight: 4 }}>
              {uploadedFiles.length === 0 ? <span style={{ color: '#888' }}>No files</span> : uploadedFiles.map((f, i) => <div key={i}>{f}</div>)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 32, marginTop: 40, marginRight: 60 }}>
          <button
            onClick={handleImport}
            disabled={!selectedFile}
            style={{ background: selectedFile ? '#7a2323' : '#888', color: 'white', border: 'none', borderRadius: 18, padding: '18px 48px', fontSize: 28, fontWeight: 700, fontFamily: 'serif', cursor: selectedFile ? 'pointer' : 'not-allowed', minWidth: 180, textAlign: 'center', letterSpacing: 1 }}
          >
            IMPORT
          </button>
          <button
            disabled
            style={{ background: imported ? '#4caf50' : '#888', color: 'white', border: 'none', borderRadius: 18, padding: '18px 38px', fontSize: 22, fontWeight: 700, fontFamily: 'serif', minWidth: 180, textAlign: 'center', opacity: imported ? 1 : 0.7, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Saved in system
            <img src={saveIcon} alt="Saved" style={{ width: 26, height: 26, marginLeft: 6, filter: imported ? 'none' : 'grayscale(1) opacity(0.7)' }} />
          </button>
        </div>
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" />
        </div>
        <div className="modal" style={{ display: showModal ? 'flex' : 'none' }}>
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={hideLogoutModal}>Cancel</button>
              <button onClick={() => quitSystem('manual')}>Quit</button>
            </div>
          </div>
        </div>
      </div>
      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 320
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#4caf50', marginBottom: 16 }}>Curriculum files uploaded and processed successfully!</div>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                marginTop: 18, background: '#7a2323', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 32px', fontSize: 18, fontWeight: 600, cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Error Popup */}
      {showErrorPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 320
          }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#7a2323', marginBottom: 16 }}>{errorPopupMessage}</div>
            <button
              onClick={() => setShowErrorPopup(false)}
              style={{
                marginTop: 18, background: '#7a2323', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 32px', fontSize: 18, fontWeight: 600, cursor: 'pointer'
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