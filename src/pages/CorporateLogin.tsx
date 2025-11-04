import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WelcomeLogin } from '@/components/WelcomeLogin';
import { useToast } from '@/hooks/use-toast';

const CorporateLogin = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const authUrl = `https://iugxnhdxbpzauqwkjtao.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(window.location.origin + '/portal/corporativo')}&scopes=${encodeURIComponent('email openid profile')}`;

  // Verificar callback do Azure AD
  useEffect(() => {
    const handleAzureCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setLoading(true);
        try {
          // Sincronizar usuário Azure
          const { data, error } = await supabase.functions.invoke('sync-azure-user', {
            body: {
              user: session.user,
              metadata: session.user.user_metadata
            }
          });

          if (error) throw error;

          // Usar o perfil retornado pela edge function
          if (data?.profile) {
            // Se perfil não está completo, redirecionar
            if (!data.profile.profile_completed) {
              navigate('/completar-perfil?force=true');
              return;
            }

            setUserProfile(data.profile);
            setShowWelcome(true);
          }
        } catch (error: any) {
          console.error('Erro ao processar login Azure:', error);
          toast({
            title: "Erro no login",
            description: error.message || "Erro ao processar autenticação",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      }
    };

    handleAzureCallback();
  }, [navigate, toast]);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email openid profile',
          redirectTo: `${window.location.origin}/portal/corporativo`,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;

      if (data?.url) {
        const win = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Fallback se o navegador bloquear popups
          window.location.href = data.url;
        } else {
          toast({
            title: 'Login aberto em nova aba',
            description: 'Conclua o login na nova janela e volte aqui.',
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao fazer login com Microsoft:', error);
      toast({
        title: 'Erro no login',
        description: error.message || 'Não foi possível conectar com Microsoft',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
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
                <CardTitle className="text-ffp-navy text-center">Acesso com Microsoft 365</CardTitle>
                <CardDescription className="text-gray-600 text-center">
                  Use sua conta corporativa FFP para acessar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-ffp-navy text-ffp-navy hover:bg-ffp-navy hover:text-white transition-all h-12 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                        <path fill="#f35325" d="M1 1h10v10H1z"/>
                        <path fill="#81bc06" d="M12 1h10v10H12z"/>
                        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                        <path fill="#ffba08" d="M12 12h10v10H12z"/>
                      </svg>
                      Entrar com Microsoft 365
                    </>
                  )}
                </Button>

                <p className="text-center text-sm">
                  Se não abrir, <a href={authUrl} target="_blank" rel="noopener noreferrer" className="text-ffp-navy underline hover:text-ffp-gold">clique aqui para continuar o login</a>.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  <p className="font-medium mb-1">ℹ️ Acesso restrito</p>
                  <p className="text-xs text-blue-800">
                    Apenas colaboradores FFP com conta Microsoft 365 corporativa podem acessar este sistema.
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
