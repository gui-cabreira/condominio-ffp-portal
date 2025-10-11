import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type LogoutCallback = (userInfo: { userName: string; userEmail: string; avatarUrl?: string }) => void;

type UserRole = Database['public']['Enums']['user_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: (onLogoutStart?: LogoutCallback) => Promise<void>;
  hasRole: (role: UserRole) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Clean up auth state utility
const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { toast } = useToast();

  // Function to load user roles
  const loadUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading user roles:', error);
        setUserRoles([]);
        return;
      }

      setUserRoles(data.map(item => item.role));
    } catch (error) {
      console.error('Error loading user roles:', error);
      setUserRoles([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load user roles when user is authenticated
          setTimeout(() => {
            loadUserRoles(session.user.id);
          }, 0);
        } else {
          setUserRoles([]);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          loadUserRoles(session.user.id);
        }, 0);
      } else {
        setUserRoles([]);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Criar registro de falha de login
        try {
          await supabase.from('login_logs').insert({
            user_id: null,
            success: false,
            metadata: {
              email: email,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.error('Error creating failed login log:', logError);
        }
        
        toast({
          title: "Erro de Autenticação",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        // Criar registro de login
        try {
          await supabase.from('login_logs').insert({
            user_id: data.user.id,
            success: true,
            metadata: {
              email: data.user.email,
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.error('Error creating login log:', logError);
        }
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
      }

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (onLogoutStart?: LogoutCallback) => {
    try {
      // Buscar informações do usuário antes de fazer logout
      if (user && onLogoutStart) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const fullName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || 'Usuário'
          : user.email || 'Usuário';

        onLogoutStart({
          userName: fullName,
          userEmail: user.email || '',
          avatarUrl: profile?.avatar_url
        });

        // Aguardar a animação de logout
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      window.location.href = '/portal';
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const hasRole = async (role: UserRole): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', role)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const value = {
    user,
    session,
    loading,
    userRoles,
    signIn,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};