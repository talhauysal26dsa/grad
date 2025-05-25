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

export default function ImportTranscript() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('system');
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
  const pdfFileInputRef = useRef();
  const csvFileInputRef = useRef();
  const [imported, setImported] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("pdf"); // Default to PDF tab
  const [showNoPdfModal, setShowNoPdfModal] = useState(false);

  // --- LOGOUT BUTTON STYLES ---
  const logoutBtnStyle = {
    position: 'fixed',
    bottom: 24,
    right: 26,
    zIndex: 3000,
    cursor: 'pointer',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
   
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

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    // Reset file selection when changing tabs
    setSelectedFile(null);
    setUploadedFiles([]);
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setSelectedTab(type); // Set the active tab based on file type
      setImported(false);

      // Check zip file contents
      const zip = new JSZip();
      const files = [];
      try {
        const loadedZip = await zip.loadAsync(file);
        loadedZip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            // For PDF type, look for PDF files
            if (type === "pdf" && zipEntry.name.toLowerCase().endsWith('.pdf')) {
              files.push(zipEntry.name);
            }
            // For CSV type, look for CSV files
            else if (type === "csv" && zipEntry.name.toLowerCase().endsWith('.csv')) {
              files.push(zipEntry.name);
            }
          }
        });
        setUploadedFiles(files);
        // Show warning if no appropriate files found
        if (files.length === 0) {
          setErrorPopupMessage('No compatible files found in the ZIP archive.');
          setShowErrorPopup(true);
        }
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

  function handlePdfBrowseClick() {
    pdfFileInputRef.current.click();
  }
  
  function handleCsvBrowseClick() {
    csvFileInputRef.current.click();
  }

  async function handleImport() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('fileType', selectedTab);

    try {
      const response = await axios.post('http://localhost:8080/api/transcripts/upload-zip', formData, {
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
      const msg = error.response?.data || 'Error uploading transcripts. Please try again.';
      setErrorPopupMessage(msg);
      setShowErrorPopup(true);
      setImported(false);
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f5f5f5', overflow: 'auto' }}>
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
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', zIndex: 1000 }}>IMPORT TRANSCRIPT</h1>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          margin: '10px auto 0',
          maxWidth: 600,
          borderBottom: '2px solid #ddd'
        }}>
          <button 
            onClick={() => handleTabChange('pdf')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'pdf' ? '3px solid #7a2323' : '3px solid transparent',
              padding: '15px 20px',
              fontSize: 18,
              fontWeight: selectedTab === 'pdf' ? 'bold' : 'normal',
              color: selectedTab === 'pdf' ? '#7a2323' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            PDF Transcripts
          </button>
          <button
            onClick={() => handleTabChange('csv')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'csv' ? '3px solid #7a2323' : '3px solid transparent',
              padding: '15px 20px',
              fontSize: 18,
              fontWeight: selectedTab === 'csv' ? 'bold' : 'normal',
              color: selectedTab === 'csv' ? '#7a2323' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            CSV Transcripts
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 20, margin: '30px auto 0 auto', maxWidth: 900, minHeight: 320 }}>
          {/* Upload Section - Shows based on selected tab */}
          <div style={{ flex: 2, border: '2px solid #333', borderRadius: '12px', background: '#fff', minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
            <img src={uploadIcon} alt="Upload" style={{ width: 64, height: 64, marginBottom: 16 }} />
            
            {selectedTab === 'pdf' ? (
              <>
                <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>PDF Transcripts</h3>
                <button 
                  onClick={handlePdfBrowseClick} 
                  style={{ 
                    background: '#7a2323', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 24, 
                    padding: '12px 38px', 
                    fontSize: 24, 
                    fontWeight: 700, 
                    fontFamily: 'serif', 
                    marginBottom: 10, 
                    cursor: 'pointer',
                    letterSpacing: 1,
                  }}
                >
                  BROWSE
                </button>
                <input 
                  type="file" 
                  accept=".zip" 
                  ref={pdfFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(e, 'pdf')} 
                />
                <div style={{ color: '#444', fontSize: 18, marginTop: 10 }}>
                  Upload a <b>.zip</b> file containing PDF transcripts
                </div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 16, fontStyle: 'italic', maxWidth: 400 }}>
                  The system will parse the PDFs and create CSV files automatically. Each PDF should be named with the student ID followed by "_transcript.pdf".
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>CSV Transcripts</h3>
                <button 
                  onClick={handleCsvBrowseClick} 
                  style={{ 
                    background: '#7a2323', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 24, 
                    padding: '12px 38px', 
                    fontSize: 24, 
                    fontWeight: 700, 
                    fontFamily: 'serif', 
                    marginBottom: 10, 
                    cursor: 'pointer',
                    letterSpacing: 1,
                  }}
                >
                  BROWSE
                </button>
                <input 
                  type="file" 
                  accept=".zip" 
                  ref={csvFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(e, 'csv')} 
                />
                <div style={{ color: '#444', fontSize: 18, marginTop: 10 }}>
                  Upload a <b>.zip</b> file containing CSV transcripts
                </div>
                <div style={{ color: '#666', fontSize: 14, marginTop: 16, fontStyle: 'italic', maxWidth: 400 }}>
                  Use this option if you already have properly formatted transcript CSV files. Each CSV should be named with the student ID.
                </div>
              </>
            )}
          </div>
          
          {/* File List Section */}
          <div style={{ flex: 1, border: '2px solid #333', borderRadius: '12px', background: '#d9d5d3', minHeight: 320, padding: '24px 18px', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 12, color: '#444' }}>Uploaded Files</div>
            <div style={{ fontSize: 16, color: '#333', fontFamily: 'monospace', overflowY: 'auto', maxHeight: 220, minHeight: 200, width: '100%', paddingRight: 4 }}>
              {uploadedFiles.length === 0 ? 
                <span style={{ color: '#888' }}>No files</span> : 
                uploadedFiles.map((f, i) => <div key={i}>{f}</div>)
              }
            </div>
            <div style={{ marginTop: 'auto', color: '#555', fontStyle: 'italic', fontSize: 14 }}>
              {selectedFile ? 
                `Selected file type: ${selectedTab.toUpperCase()}` : 
                `Select a ${selectedTab.toUpperCase()} zip file to upload`
              }
            </div>
          </div>
        </div>

        <div style={{
          position: 'fixed',
          bottom: 24,
          left: 0,
          width: '100vw',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 32,
          zIndex: 100,
          paddingRight: '100px'
        }}>
          <button
            onClick={handleImport}
            disabled={!selectedFile}
            style={{ 
              background: selectedFile ? '#7a2323' : '#888', 
              color: 'white', 
              border: 'none', 
              borderRadius: 18, 
              padding: '18px 48px', 
              fontSize: 28, 
              fontWeight: 700, 
              fontFamily: 'serif', 
              cursor: selectedFile ? 'pointer' : 'not-allowed', 
              minWidth: 180, 
              textAlign: 'center', 
              letterSpacing: 1 
            }}
          >
            IMPORT
          </button>
          <button
            disabled
            style={{ 
              background: imported ? '#4caf50' : '#888', 
              color: 'white', 
              border: 'none', 
              borderRadius: 18, 
              padding: '14px 32px', 
              fontSize: 20, 
              fontWeight: 700, 
              fontFamily: 'serif', 
              minWidth: 140, 
              textAlign: 'center', 
              opacity: imported ? 1 : 0.7, 
              letterSpacing: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}
          >
            Saved in system
            <img src={saveIcon} alt="Saved" style={{ width: 18, height: 18, marginLeft: 6, filter: imported ? 'none' : 'grayscale(1) opacity(0.7)' }} />
          </button>
        </div>
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
          style={logoutBtnStyle}
        >
          <img src="https://cdn-icons-png.flaticon.com/512/1828/1828479.png" alt="Logout" style={{ width: 28, height: 28 }} />
        </div>
      </div>
      
      {/* Logout confirmation modal */}
      {showModal && (
        <div className="modal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content">
            <p>Are you sure you want to quit?</p>
            <div className="modal-buttons">
              <button onClick={hideLogoutModal}>Cancel</button>
              <button onClick={() => quitSystem('manual')}>Quit</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success modal */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 3001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 40, width: 500, textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowSuccessModal(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            <div style={{ width: 80, height: 80, margin: '0 auto 20px', background: '#4caf50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 50 }}>✓</span>
            </div>
            <h2 style={{ color: '#2ecc40', fontWeight: 700, fontSize: 26, fontFamily: 'inherit', marginBottom: 18 }}>Curriculum files uploaded and processed successfully!</h2>
            <button onClick={() => setShowSuccessModal(false)} style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 18, fontWeight: 600, cursor: 'pointer', marginTop: 18 }}>OK</button>
          </div>
        </div>
      )}
      
      {/* Error popup */}
      {showErrorPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 3001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 8, padding: 40, width: 500, textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowErrorPopup(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            <div style={{ width: 80, height: 80, margin: '0 auto 20px', background: '#ff5252', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 50 }}>!</span>
            </div>
            <h2 style={{ color: '#e74c3c', fontWeight: 700, fontSize: 24, fontFamily: 'inherit', marginBottom: 18 }}>Error</h2>
            <div style={{ fontSize: 20, color: '#7a2323', fontWeight: 600, marginBottom: 30, fontFamily: 'inherit' }}>{errorPopupMessage}</div>
            <button onClick={() => setShowErrorPopup(false)} style={{ background: '#7a2323', color: 'white', border: 'none', borderRadius: 8, padding: '10px 32px', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}

      {/* No PDF modal */}
      {showNoPdfModal && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: 16, padding: '32px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', minWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <p style={{ fontSize: 22, marginBottom: 18, color: '#7a2323', fontWeight: 600, textAlign: 'center' }}>
              No compatible files found in the ZIP archive.
            </p>
            <button onClick={() => setShowNoPdfModal(false)} style={{ padding: '10px 28px', fontSize: 18, borderRadius: 8, background: '#7a2323', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: 12 }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
} 