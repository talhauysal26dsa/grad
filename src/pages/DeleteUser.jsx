import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import adminIcon from '../assets/admin-icon.png';
import axios from 'axios';

const menuItems = [
  { key: 'system', label: 'System Start' },
  { key: 'logs', label: 'Log Records' },
  { key: 'delete', label: 'Delete User' },
];

const dummyUser = {
  name: 'Full Name',
  number: 'Student Number',
  email: 'email@std.iyte.edu.tr',
  role: 'Role',
};

// Role id'den string role ismi
const roleMap = {
  1: 'Faculty Secretary',
  2: 'Department Secretary',
  3: 'Advisor',
  4: 'Student Affairs',
  5: 'Student',
  6: 'Admin',
};

const roleOptions = [
  { id: 1, label: 'Faculty Secretary' },
  { id: 2, label: 'Department Secretary' },
  { id: 3, label: 'Advisor' },
  { id: 4, label: 'Student Affairs' },
  { id: 5, label: 'Student' },
  { id: 6, label: 'Admin' },
];

export default function DeleteUser() {
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('delete');
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState('');
  const [roleUsers, setRoleUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterGraduated, setFilterGraduated] = useState(false);

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

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
  const userName = currentUser ? `${currentUser.name} ${currentUser.surname}` : 'Name Surname';

  useEffect(() => {
    if (roleFilter) {
      setSearchValue("");
      setSearchResults([]);
      setNotFound(false);
      fetch(`http://localhost:8080/api/auth/users-by-role?roleId=${roleFilter}`)
        .then(res => res.json())
        .then(data => setRoleUsers(data))
        .catch(() => setRoleUsers([]));
    } else {
      setRoleUsers([]);
    }
  }, [roleFilter]);

  useEffect(() => {
    setSearchValue("");
    setSearchResults([]);
    setNotFound(false);
  }, [filterGraduated]);

  useEffect(() => {
    axios.get('http://localhost:8080/api/departments').then(res => setDepartments(res.data));
    axios.get('http://localhost:8080/api/faculties').then(res => setFaculties(res.data));
  }, []);

  useEffect(() => {
    // Tarayıcı geri/ileri butonunu devre dışı bırak ve session'ı temizle
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = function() {
      window.history.pushState(null, '', window.location.href);
      quitSystem('back');
    };
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setNotFound(false);
    setUser(null);
    setSearchResults([]);
    if (roleFilter) {
      // Eğer hem student hem de graduated filtre aktifse, sadece mezun öğrencilerde arama yap
      let baseList = roleUsers;
      if (roleFilter === '5' && filterGraduated) {
        baseList = roleUsers.filter(u => u.graduation_status === 'true');
      }
      const filtered = baseList.filter(u => {
        const q = searchValue.toLowerCase();
        return (
          (u.fullname && u.fullname.toLowerCase().includes(q)) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.surname && u.surname.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.studentid && u.studentid.toLowerCase().includes(q))
        );
      });
      if (filtered.length > 0) {
        setSearchResults(filtered);
      } else {
        setNotFound(true);
      }
    } else {
      // Tüm kullanıcılar arasında arama (mevcut davranış)
      try {
        const res = await fetch(`http://localhost:8080/api/auth/search-users?query=${encodeURIComponent(searchValue)}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
    }
  }

  function handleDelete() {
    if (window.confirm('Are you sure you want to delete this user?')) {
      alert('User deleted successfully!');
      setUser(null);
      setSearchValue('');
    }
  }

  // Checkbox seçimi
  function handleCheckboxChange(userId) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }

  // Tümünü seç
  function handleSelectAll(users) {
    if (users.length === 0) return;
    const allIds = users.map(u => u.userID);
    const allSelected = allIds.every(id => selectedUsers.includes(id));
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedUsers(prev => Array.from(new Set([...prev, ...allIds])));
    }
  }

  // Toplu silme
  function handleBulkDelete() {
    if (selectedUsers.length === 0) return;
    setShowPasswordModal(true);
    setAdminPassword('');
    setPasswordError('');
  }

  async function handlePasswordConfirm() {
    // Admin emailini localStorage'dan al
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('user'));
    } catch {}
    const email = currentUser ? (currentUser.email || '').trim().toLowerCase() : '';
    try {
      const res = await fetch('http://localhost:8080/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: adminPassword })
      });
      if (!res.ok) {
        setPasswordError('Password is incorrect, please try again.');
        return;
      }
      setShowPasswordModal(false);
      setAdminPassword('');
      setPasswordError('');
      confirmBulkDelete();
    } catch (e) {
      setPasswordError('Password is incorrect, please try again.');
    }
  }

  function handlePasswordModalClose() {
    setShowPasswordModal(false);
    setAdminPassword('');
    setPasswordError('');
  }

  async function confirmBulkDelete() {
    try {
      const res = await fetch('http://localhost:8080/api/auth/delete-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers })
      });
      if (!res.ok) throw new Error('Delete failed');
      setRoleUsers(prev => prev.filter(u => !selectedUsers.includes(u.userID)));
      setSearchResults(prev => prev.filter(u => !selectedUsers.includes(u.userID)));
      setSelectedUsers([]);
      setShowDeleteModal(false);
      setSuccessMessage('Selected users deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      alert('Delete failed!');
      setShowDeleteModal(false);
    }
  }

  function cancelBulkDelete() {
    setShowDeleteModal(false);
  }

  // Mezun filtreli kullanıcılar (sadece string 'true')
  const filteredRoleUsers = roleFilter === '5' && filterGraduated
    ? roleUsers.filter(u => u.graduation_status === 'true')
    : roleUsers;
  const filteredSearchResults = roleFilter === '5' && filterGraduated
    ? searchResults.filter(u => u.graduation_status === 'true')
    : searchResults;

  // Rol id'den label'ı küçük harfe çeviren yardımcı fonksiyon
  function getRoleLabelById(id) {
    const opt = roleOptions.find(r => String(r.id) === String(id));
    return opt ? opt.label.toLowerCase() : '';
  }

  // Tabloyu sadece gösterilecek kullanıcı varsa göster
  const showTable = (filteredSearchResults.length > 0) || (filteredSearchResults.length === 0 && filteredRoleUsers.length > 0 && !notFound);

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
              } else if (item.key === 'logs') {
                navigate('/log-records');
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
            <img src={adminIcon} alt="Admin" style={{ width: 54, height: 54, objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 20, color: 'white', fontWeight: 500, whiteSpace: 'nowrap' }}>{userName}</div>
        </div>
      </div>
      <div style={{ padding: '2rem', textAlign: 'center', position: 'relative', transition: 'margin-left 0.3s', marginLeft: sidebarOpen ? 260 : 0 }}>
        <h1 style={{ color: '#7a2323', textAlign: 'left', marginLeft: 40, fontSize: 40, fontFamily: 'serif', fontWeight: 400, transition: 'margin-left 0.3s', position: 'sticky', top: 120, background: '#f5f5f5', zIndex: 1000 }}>DELETE USER</h1>
        {/* Sticky üst bar: search, filter ve sil butonu */}
        <div style={{
          position: 'sticky',
          top: 120,
          zIndex: 1500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f5f5f5',
          padding: '12px 0 12px 0',
          maxWidth: 1400,
          margin: '0 auto',
          borderRadius: '16px 16px 0 0',
        }}>
          {/* Sol: Seçili Kullanıcıları Sil butonu */}
          <button
            onClick={handleBulkDelete}
            disabled={selectedUsers.length === 0}
            style={{
              marginLeft: 8,
              padding: '10px 24px',
              fontSize: 20,
              borderRadius: 8,
              background: selectedUsers.length === 0 ? '#ccc' : '#a00',
              color: 'white',
              border: 'none',
              cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
            }}
          >
            Delete Selected Users
          </button>
          {/* Sağ: Search ve Filter by Role */}
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 8 }}>
            <input
              type="text"
              placeholder="search…"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              style={{ fontSize: 28, borderRadius: 40, border: '2px solid #aaa', padding: '6px 24px', width: 320, background: '#bdbdbd', color: '#444', outline: 'none', fontFamily: 'serif' }}
            />
            <button type="submit" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 28, color: '#444', marginLeft: -36 }}>
              <span role="img" aria-label="search">🔍</span>
            </button>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{ fontSize: 20, borderRadius: 20, border: '2px solid #aaa', padding: '6px 16px', background: '#bdbdbd', color: '#444', outline: 'none', fontFamily: 'serif' }}
            >
              <option value="">Filter by Role</option>
              {roleOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            {roleFilter === '5' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, marginLeft: 8 }}>
                <input
                  type="checkbox"
                  checked={filterGraduated}
                  onChange={e => setFilterGraduated(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                Filter graduated student
              </label>
            )}
          </form>
        </div>
        {/* Kullanıcı bulunamadı mesajı */}
        {notFound && (
          <div style={{ color: '#a00', fontSize: 22, marginBottom: 24 }}>
            {roleFilter === '5' && filterGraduated
              ? 'No such graduated student found.'
              : roleFilter
                ? `No such ${getRoleLabelById(roleFilter)} found.`
                : 'Kullanıcı bulunamadı.'}
          </div>
        )}
        {showTable && (
          <div style={{ margin: '0 auto 32px auto', maxWidth: 1400, width: '100%', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden', maxHeight: 390, overflowY: 'auto' }}>
            <table style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 22, background: 'transparent', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead style={{ background: '#d9d5d3', position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ padding: '16px 8px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'center', fontWeight: 700, fontSize: 22 }}>
                    <input
                      type="checkbox"
                      checked={(() => {
                        const users = filteredSearchResults.length > 0 ? filteredSearchResults : filteredRoleUsers;
                        if (users.length === 0) return false;
                        return users.every(u => selectedUsers.includes(u.userID));
                      })()}
                      onChange={() => handleSelectAll(filteredSearchResults.length > 0 ? filteredSearchResults : filteredRoleUsers)}
                    />
                  </th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Name</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Email</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Role</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Department</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', borderRight: '1px solid #ccc', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Faculty</th>
                  <th style={{ padding: '16px 18px', borderBottom: '2px solid #aaa', textAlign: 'left', fontWeight: 700, fontSize: 26 }}>Student ID</th>
                </tr>
              </thead>
              <tbody>
                {/* Eğer arama sonucu varsa onları göster */}
                {filteredSearchResults.length > 0 && filteredSearchResults.map((u, idx) => {
                  const department = departments.find(dep => dep.departmentID === u.department_departmentid);
                  const faculty = faculties.find(fac => fac.facultyID === u.faculty_facultyid);
                  return (
                    <tr key={u.userID} style={{ background: '#fffbe6', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 8px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.userID)}
                          onChange={() => handleCheckboxChange(u.userID)}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.fullname}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.email}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>
                        {u.role
                          ? (roleMap[u.role.roleId] || u.role.roleName)
                          : (roleMap[u.role_role_id] || u.role_role_name || '')}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{department ? department.name : ''}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{faculty ? faculty.name : ''}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.studentid || ''}</td>
                    </tr>
                  );
                })}
                {/* Eğer arama sonucu yoksa ve rol filtresi varsa onları göster */}
                {filteredSearchResults.length === 0 && filteredRoleUsers.map((u, idx) => {
                  const department = departments.find(dep => dep.departmentID === u.department_departmentid);
                  const faculty = faculties.find(fac => fac.facultyID === u.faculty_facultyid);
                  return (
                    <tr key={u.userID} style={{ background: idx % 2 === 0 ? '#fff' : '#f7f7f7', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#e6e6e6'}
                    onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f7f7f7'}
                    >
                      <td style={{ padding: '14px 8px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.userID)}
                          onChange={() => handleCheckboxChange(u.userID)}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.fullname || [u.name, u.middleName, u.surname].filter(Boolean).join(' ')}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.email}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>
                        {u.role
                          ? (roleMap[u.role.roleId] || u.role.roleName)
                          : (roleMap[u.role_role_id] || u.role_role_name || '')}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{department ? department.name : ''}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #eee', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{faculty ? faculty.name : ''}</td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', fontSize: 22 }}>{u.studentid || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div 
          className="logout-btn" 
          onClick={showLogoutModal}
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
        {/* Delete Selected Users Modal */}
        {showDeleteModal && (
          <div className="modal" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#fff', borderRadius: 16, padding: '32px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', minWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 28, color: '#7a2323', fontWeight: 600, textAlign: 'center' }}>
                Are you sure you want to delete {selectedUsers.length} selected user{selectedUsers.length > 1 ? 's' : ''}?
              </p>
              <div className="modal-buttons" style={{ display: 'flex', gap: 24 }}>
                <button onClick={cancelBulkDelete} style={{ padding: '10px 28px', fontSize: 18, borderRadius: 8, background: '#ccc', color: '#333', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmBulkDelete} style={{ padding: '10px 28px', fontSize: 18, borderRadius: 8, background: '#a00', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {/* Password Modal */}
        {showPasswordModal && (
          <div className="modal" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#fff', borderRadius: 16, padding: '32px 40px', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', minWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* X butonu */}
              <button onClick={handlePasswordModalClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 28, color: '#a00', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }} aria-label="Close">&times;</button>
              <p style={{ fontSize: 22, marginBottom: 18, color: '#7a2323', fontWeight: 600, textAlign: 'center' }}>
                Please enter your password to confirm deletion
              </p>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Password"
                style={{ fontSize: 20, padding: '10px 18px', borderRadius: 8, border: '1.5px solid #aaa', marginBottom: 12, width: 220 }}
                autoFocus
              />
              {passwordError && <div style={{ color: '#a00', fontWeight: 600, marginBottom: 10 }}>{passwordError}</div>}
              <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                <button onClick={handlePasswordModalClose} style={{ padding: '10px 28px', fontSize: 18, borderRadius: 8, background: '#ccc', color: '#333', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handlePasswordConfirm} style={{ padding: '10px 28px', fontSize: 18, borderRadius: 8, background: '#a00', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {/* Başarı mesajı */}
        {successMessage && (
          <div style={{ position: 'fixed', top: 140, left: 0, right: 0, zIndex: 3001, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#4caf50', color: 'white', padding: '18px 40px', borderRadius: 12, fontSize: 22, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.13)' }}>
              {successMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 