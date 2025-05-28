
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

const CorporateLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = (data: any) => {
    console.log('Login corporativo:', data);
    // Aqui você implementaria a lógica de autenticação
    // Por enquanto, vamos redirecionar para o dashboard
    window.location.href = '/portal/corporativo/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy-light to-ffp-navy-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/portal" className="inline-flex items-center text-ffp-gold hover:text-ffp-gold-light mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Portal
          </Link>
          <div className="mx-auto mb-6 w-20 h-20 bg-ffp-gold rounded-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-ffp-navy" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Acesso Corporativo
          </h1>
          <p className="text-ffp-gold">
            Sistema interno FFP Advogados
          </p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-ffp-gold/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Fazer Login</CardTitle>
            <CardDescription className="text-ffp-gold text-center">
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
                      <FormLabel className="text-white">E-mail Corporativo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu.email@ffpadvogados.com"
                          className="bg-white/20 border-ffp-gold/30 text-white placeholder-white/60"
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
                      <FormLabel className="text-white">Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-white/20 border-ffp-gold/30 text-white placeholder-white/60 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 text-white/60 hover:text-white"
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
                  className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold"
                >
                  Entrar no Sistema
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <a href="#" className="text-ffp-gold hover:text-ffp-gold-light text-sm">
                Esqueceu sua senha?
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Sistema restrito aos funcionários da FFP Advogados
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorporateLogin;
