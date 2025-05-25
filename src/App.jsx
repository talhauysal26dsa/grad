// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword'; 
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import DeleteUser from './pages/DeleteUser';
import SystemStart from './pages/SystemStart';
import ImportTranscript from './pages/ImportTranscript';
import ImportCurriculum from './pages/ImportCurriculum';
import LogRecords from './pages/LogRecords';
import FormPreparation from './pages/FormPreparation';
import DepartmentSecretarySort from './pages/DepartmentSecretarySort';
import CheckStatus from './pages/CheckStatus';
import FacultySecretarySort from './pages/FacultySecretarySort';
import StudentAffairsSort from './pages/StudentAffairsSort';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/delete-user" element={
          <PrivateRoute requiredRole={6}>
            <DeleteUser />
          </PrivateRoute>
        } />
        <Route path="/system-start" element={<SystemStart />} />
        <Route path="/import-transcript" element={
          <PrivateRoute requiredRole={2}>
            <ImportTranscript />
          </PrivateRoute>
        } />
        <Route path="/import-curriculum" element={
          <PrivateRoute requiredRole={2}>
            <ImportCurriculum />
          </PrivateRoute>
        } />
        <Route path="/log-records" element={
          <PrivateRoute requiredRole={6}>
            <LogRecords />
          </PrivateRoute>
        } />
        <Route path="/form-preparation" element={
          <PrivateRoute requiredRole={3}>
            <FormPreparation />
          </PrivateRoute>
        } />
        <Route path="/department-secretary-sort" element={
          <PrivateRoute requiredRole={2}>
            <DepartmentSecretarySort />
          </PrivateRoute>
        } />
        <Route path="/check-status" element={
          <PrivateRoute requiredRole={5}>
            <CheckStatus />
          </PrivateRoute>
        } />
        <Route path="/faculty-secretary-sort" element={
          <PrivateRoute requiredRole={1}>
            <FacultySecretarySort />
          </PrivateRoute>
        } />
        <Route path="/student-affairs-sort" element={
          <PrivateRoute requiredRole={4}>
            <StudentAffairsSort />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
