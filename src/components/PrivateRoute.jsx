import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, requiredRole }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    // Kullanıcı yoksa login sayfasına yönlendir
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role_id !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute; 