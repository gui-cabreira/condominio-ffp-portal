import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeySquare, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    // Verificar se há uma sessão ativa (usuário veio do link de reset)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        toast({
          title: "Link inválido",
          description: "Por favor, solicite um novo link de redefinição de senha.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/esqueci-senha'), 3000);
      }
    });
  }, [navigate, toast]);

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setSuccess(true);
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi alterada com sucesso."
        });
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/portal/corporativo');
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-32 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-md mx-auto text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-ffp-navy" />
              <p className="text-gray-600">Verificando link...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <main className="pt-32 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="mx-auto mb-6 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                  Senha Redefinida!
                </h1>
                <p className="text-gray-600">
                  Sua senha foi alterada com sucesso. Você será redirecionado para o login.
                </p>
              </div>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Button 
                      onClick={() => navigate('/portal/corporativo')}
                      className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white"
                    >
                      Ir para o Login
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
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
              <div className="mx-auto mb-6 w-20 h-20 bg-ffp-navy rounded-full flex items-center justify-center">
                <KeySquare className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                Nova Senha
              </h1>
              <p className="text-gray-600">
                Digite sua nova senha abaixo
              </p>
            </div>

            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-ffp-navy text-center">Redefinir Senha</CardTitle>
                <CardDescription className="text-gray-600 text-center">
                  Escolha uma senha segura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ffp-navy">Nova Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="border-gray-300 focus:border-ffp-gold focus:ring-ffp-gold pr-10"
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

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ffp-navy">Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="border-gray-300 focus:border-ffp-gold focus:ring-ffp-gold pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-ffp-navy"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-xs text-gray-600 space-y-1">
                      <p>A senha deve conter:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Mínimo de 8 caracteres</li>
                        <li>Pelo menos uma letra maiúscula</li>
                        <li>Pelo menos uma letra minúscula</li>
                        <li>Pelo menos um número</li>
                      </ul>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white font-semibold disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redefinindo...
                        </>
                      ) : (
                        'Redefinir Senha'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
