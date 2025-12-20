import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export const AuthGuard = ({ children, requiredRole, redirectTo = '/portal' }: AuthGuardProps) => {
  const { user, loading, hasRole } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading) {
        if (!user) {
          window.location.href = redirectTo;
          return;
        }

        // Admin tem acesso total a tudo
        const isAdmin = await hasRole('admin');
        if (isAdmin) {
          return;
        }

        if (requiredRole) {
          const userHasRole = await hasRole(requiredRole);
          if (!userHasRole) {
            window.location.href = '/portal';
            return;
          }
        }
      }
    };

    checkAuth();
  }, [user, loading, requiredRole, redirectTo, hasRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-ffp-navy" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting...
  }

  return <>{children}</>;
};