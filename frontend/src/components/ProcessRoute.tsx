import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProcessRouteProps {
  children: React.ReactNode;
}

export default function ProcessRoute({ children }: ProcessRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if user is authenticated OR has a guest session
  const hasGuestSession = !!localStorage.getItem('guestId');

  if (!isAuthenticated && !hasGuestSession) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
