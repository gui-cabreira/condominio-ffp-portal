
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { WelcomeLogin } from '@/components/WelcomeLogin';

const CorporateLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: any) => {
    const result = await signIn(data.email, data.password);
    
    if (!result.error) {
      // Aguardar um pouco para garantir que o usuário está autenticado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Buscar perfil do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserProfile(profile);
          setShowWelcome(true);
        } else {
          // Se não tiver perfil, criar um básico para mostrar o welcome
          setUserProfile({
            email: data.email,
            first_name: data.email.split('@')[0],
            last_name: '',
            avatar_url: null
          });
          setShowWelcome(true);
        }
      }
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
              <div className="mx-auto mb-6 w-20 h-20 bg-ffp-navy rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                Acesso Corporativo
              </h1>
              <p className="text-gray-600">
                Sistema interno FFP Advogados
              </p>
            </div>

            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-ffp-navy text-center">Fazer Login</CardTitle>
                <CardDescription className="text-gray-600 text-center">
                  Entre com suas credenciais corporativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ffp-navy">E-mail Corporativo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="seu.email@ffpadvogados.com"
                              className="border-gray-300 focus:border-ffp-gold focus:ring-ffp-gold"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ffp-navy">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="border-gray-300 focus:border-ffp-gold focus:ring-ffp-gold pr-10"
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-ffp-navy"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white font-semibold disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar no Sistema'
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center space-y-2">
                  <Link to="/esqueci-senha" className="text-ffp-gold hover:text-ffp-gold-dark text-sm block">
                    Esqueceu sua senha?
                  </Link>
                  <p className="text-sm text-gray-600">
                    Não tem conta?{' '}
                    <Link to="/cadastro" className="text-ffp-navy hover:underline font-medium">
                      Criar conta
                    </Link>
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
