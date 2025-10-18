import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AccessControlProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const AccessControl = ({ children, allowedRoles, fallback = null }: AccessControlProps) => {
  const { user, userRoles } = useAuth();

  if (!user) {
    return fallback;
  }

  const hasAccess = userRoles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    return fallback;
  }

  return <>{children}</>;
};

// Componente para diferentes tipos de acesso
export const AdminOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['admin']} fallback={fallback}>
    {children}
  </AccessControl>
);

export const AdminOrEmployee = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['admin', 'employee']} fallback={fallback}>
    {children}
  </AccessControl>
);

export const AllRoles = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['admin', 'employee', 'supervisor', 'assistant']} fallback={fallback}>
    {children}
  </AccessControl>
);

// Componente para Assistentes
export const AssistantOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['assistant']} fallback={fallback}>
    {children}
  </AccessControl>
);

// Componente para Admins e Assistentes
export const AdminOrAssistant = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['admin', 'assistant']} fallback={fallback}>
    {children}
  </AccessControl>
);

// Componente para Developer apenas
export const DeveloperOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <AccessControl allowedRoles={['developer']} fallback={fallback}>
    {children}
  </AccessControl>
);