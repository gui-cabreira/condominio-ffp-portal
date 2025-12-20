import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WelcomeLogin } from '@/components/WelcomeLogin';
import { useToast } from '@/hooks/use-toast';

const CorporateLogin = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificar sessão existente
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await handleUserLogin(session.user);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserLogin(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserLogin = async (user: any) => {
    setLoading(true);
    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Verificar se usuário está aprovado
      if (profile && !profile.approved) {
        navigate('/aguardando-aprovacao');
        return;
      }

      // Buscar role do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          ...profile,
          role: roleData?.role || 'employee'
        });
        setShowWelcome(true);
      } else {
        // Se não tem perfil, redirecionar para completar
        navigate('/completar-perfil?force=true');
      }
    } catch (error: any) {
      console.error('Erro ao processar login:', error);
      toast({
        title: "Erro no login",
        description: error.message || "Erro ao processar autenticação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou senha incorretos');
        }
        throw error;
      }

      if (data.user) {
        // Registrar log de login
        await supabase.from('login_logs').insert({
          user_id: data.user.id,
          success: true,
          metadata: { method: 'email_password' }
        });
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      
      // Registrar tentativa falha
      await supabase.from('login_logs').insert({
        user_id: null,
        success: false,
        metadata: { method: 'email_password', email, error: error.message }
      });

      toast({
        title: 'Erro no login',
        description: error.message || 'Não foi possível fazer login',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (showWelcome && userProfile) {
    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email;
    
    return (
      <WelcomeLogin
        userName={fullName}
        userEmail={userProfile.email}
        avatarUrl={userProfile.avatar_url}
        onComplete={() => navigate('/portal/corporativo/dashboard')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Autenticando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <Link to="/portal" className="inline-flex items-center text-ffp-navy hover:text-ffp-gold mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Portal
              </Link>
              <div className="flex justify-center mb-6">
                <img 
                  src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                  alt="FFP Advogados" 
                  className="h-16 w-auto"
                />
              </div>
              <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                Portal Corporativo
              </h1>
              <p className="text-gray-600">
                Login exclusivo para colaboradores FFP Advogados
              </p>
            </div>

            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-ffp-navy text-center">Acesso ao Sistema</CardTitle>
                <CardDescription className="text-gray-600 text-center">
                  Use seu email e senha para acessar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-ffp-navy">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@ffpadvogados.com.br"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-ffp-navy">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white h-12 font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  <div className="text-center">
                    <Link 
                      to="/esqueci-senha" 
                      className="text-sm text-ffp-navy hover:text-ffp-gold underline"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                </form>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  <p className="font-medium mb-1">ℹ️ Acesso restrito</p>
                  <p className="text-xs text-blue-800">
                    Apenas colaboradores FFP autorizados podem acessar este sistema.
                    Entre em contato com o administrador se precisar de acesso.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm">
                Sistema restrito aos funcionários da FFP Advogados
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CorporateLogin;
