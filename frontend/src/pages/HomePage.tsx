import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const HomePage = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'CANDIDATE':
      return <Navigate to="/dashboard" replace />;
    case 'RECRUITER':
      return <Navigate to="/recruiter" replace />;
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};
