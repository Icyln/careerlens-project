import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Checking access...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = Boolean(
    user.is_staff ||
    user.is_admin ||
    user.role === 'admin'
  );

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}