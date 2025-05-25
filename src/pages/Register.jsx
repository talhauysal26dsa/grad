// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';

const ROLES = [
  { value: 'Faculty Secretary', label: 'Faculty Secretary' },
  { value: 'Department Secretary', label: 'Department Secretary' },
  { value: 'Advisor', label: 'Advisor' },
  { value: 'Student Affairs', label: 'Student Affairs' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [studentID, setStudentID] = useState('');
  const [emailName, setEmailName] = useState('');
  const [emailDomain, setEmailDomain] = useState('@iyte.edu.tr');
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8080/api/faculties').then(res => setFaculties(res.data));
  }, []);

  useEffect(() => {
    if (facultyId) {
      axios.get(`http://localhost:8080/api/departments/by-faculty/${facultyId}`).then(res => setDepartments(res.data));
    } else {
      setDepartments([]);
    }
    setDepartmentId('');
  }, [facultyId]);

  // Reset role and faculty/department when email domain changes
  useEffect(() => {
    setRole('');
    setFacultyId('');
    setDepartmentId('');
  }, [emailDomain]);

  const fullEmail = emailName + emailDomain;
  const isStudent = emailDomain === '@std.iyte.edu.tr';
  const isIyte = emailDomain === '@iyte.edu.tr';

  // Role-based field visibility
  const showRole = isIyte;
  const showFaculty = (isStudent || (isIyte && (role === 'Faculty Secretary' || role === 'Department Secretary' || role === 'Advisor')));
  const showDepartment = (isStudent || (isIyte && (role === 'Department Secretary' || role === 'Advisor')));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axios.post('http://localhost:8080/api/auth/register', {
        email: fullEmail,
        password,
        name,
        middleName,
        surname,
        ...(showFaculty && { facultyId }),
        ...(showDepartment && { departmentId }),
        ...(isStudent && { studentID, role: 'Student' }),
        ...(isIyte && { role }),
      });
      navigate(`/verify?email=${encodeURIComponent(fullEmail)}`);
    } catch (err) {
      setError(err.response?.data || 'Registration failed!');
    }
  };

  const isFormValid =
    emailName &&
    password &&
    confirm &&
    name &&
    surname &&
    (!showFaculty || facultyId) &&
    (!showDepartment || departmentId) &&
    (!showRole || role) &&
    (!isStudent || studentID);

  return (
    <div className="login-bg">
      <div className="form-container">
        <img src={logo} alt="Logo" className="logo" />
        <div className="title">Graduation Management System</div>
        <div className="subtitle">Create a new account</div>
        <form onSubmit={handleRegister}>
          {/* Name */}
          <div className="input-line">
            <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))} />
            <span className="required-outside">*</span>
          </div>
          {/* Middle Name (optional) */}
          <div className="input-line">
            <input className="input" placeholder="Middle Name" value={middleName} onChange={e => setMiddleName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))} />
          </div>
          {/* Surname */}
          <div className="input-line">
            <input className="input" placeholder="Surname" value={surname} onChange={e => setSurname(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))} />
            <span className="required-outside">*</span>
          </div>
          {/* Email username + domain */}
          <div className="input-line">
            <div className="email-group">
              <input
                className="input"
                style={{ flex: 2 }}
                placeholder="Email username"
                value={emailName}
                onChange={e => setEmailName(e.target.value)}
              />
              <select
                className="input"
                style={{ flex: 1 }}
                value={emailDomain}
                onChange={e => setEmailDomain(e.target.value)}
              >
                <option value="@iyte.edu.tr">@iyte.edu.tr</option>
                <option value="@std.iyte.edu.tr">@std.iyte.edu.tr</option>
              </select>
            </div>
            <span className="required-outside">*</span>
          </div>
          {/* Role selection for iyte.edu.tr */}
          {showRole && (
            <div className="input-line">
              <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Select Position</option>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className="required-outside">*</span>
            </div>
          )}
          {/* Student ID - only if isStudent */}
          {isStudent && (
            <div className="input-line">
              <input
                className="input"
                placeholder="Student Number"
                value={studentID}
                onChange={e => setStudentID(e.target.value)}
              />
              <span className="required-outside">*</span>
            </div>
          )}
          {/* Faculty */}
          {showFaculty && (
            <div className="input-line">
              <select className="input" value={facultyId} onChange={e => setFacultyId(e.target.value)}>
                <option value="">Select Faculty</option>
                {faculties.map(fac => (
                  <option key={fac.facultyID} value={fac.facultyID}>{fac.name}</option>
                ))}
              </select>
              <span className="required-outside">*</span>
            </div>
          )}
          {/* Department */}
          {showDepartment && (
            <div className="input-line">
              <select className="input" value={departmentId} onChange={e => setDepartmentId(e.target.value)} disabled={showFaculty && !facultyId}>
                <option value="">Select Department</option>
                {departments.map(dep => (
                  <option key={dep.departmentID} value={dep.departmentID}>{dep.name}</option>
                ))}
              </select>
              <span className="required-outside">*</span>
            </div>
          )}
          {/* Password */}
          <div className="input-line">
            <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <span className="required-outside">*</span>
          </div>
          {/* Confirm Password */}
          <div className="input-line">
            <input className="input" type="password" placeholder="Confirm Password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            <span className="required-outside">*</span>
          </div>
          {/* Error message */}
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          {/* Button */}
          <button
            className="btn"
            type="submit"
            disabled={!isFormValid}
            style={{
              backgroundColor: isFormValid ? '#9A0E20' : '#ccc',
              color: isFormValid ? 'white' : '#888',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Register
          </button>
          <div className="link">Already have an account? <Link to="/">Login</Link></div>
        </form>
      </div>
    </div>
  );
}