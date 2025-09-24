import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeySquare, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  
  const form = useForm({
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/portal/corporativo`
      });
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha."
        });
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <main className="pt-32 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <Link to="/portal/corporativo" className="inline-flex items-center text-ffp-navy hover:text-ffp-gold mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Link>
                <div className="mx-auto mb-6 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                  Email Enviado!
                </h1>
                <p className="text-gray-600">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
              </div>

              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-gray-600">
                      Se você não receber o email em alguns minutos, verifique sua pasta de spam.
                    </p>
                    <Button 
                      onClick={() => setEmailSent(false)}
                      variant="outline"
                      className="w-full border-ffp-navy text-ffp-navy hover:bg-ffp-navy hover:text-white"
                    >
                      Tentar novamente
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
              <Link to="/portal/corporativo" className="inline-flex items-center text-ffp-navy hover:text-ffp-gold mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Link>
              <div className="mx-auto mb-6 w-20 h-20 bg-ffp-navy rounded-full flex items-center justify-center">
                <KeySquare className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-ffp-navy mb-2">
                Esqueceu a Senha?
              </h1>
              <p className="text-gray-600">
                Digite seu email para receber um link de redefinição
              </p>
            </div>

            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-ffp-navy text-center">Redefinir Senha</CardTitle>
                <CardDescription className="text-gray-600 text-center">
                  Enviaremos um link para seu email
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

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white font-semibold disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar Link de Redefinição'
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Lembrou da senha?{' '}
                    <Link to="/portal/corporativo" className="text-ffp-navy hover:underline font-medium">
                      Fazer login
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;