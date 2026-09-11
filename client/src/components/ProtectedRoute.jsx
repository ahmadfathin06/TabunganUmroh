import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired && user?.role !== roleRequired && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};