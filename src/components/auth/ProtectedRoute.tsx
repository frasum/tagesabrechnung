import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { PermissionLevel } from '@/types/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLevel?: PermissionLevel;
}

export function ProtectedRoute({ children, requiredLevel }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permission level if required
  if (requiredLevel && !hasPermission(requiredLevel)) {
    // Redirect to home page (waiter billing) if insufficient permissions
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
