import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Verificar se o usuário já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email, approved')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.approved) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já possui uma conta aprovada. Faça login.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Cadastro Pendente",
            description: "Seu cadastro está aguardando aprovação de um administrador.",
            variant: "default"
          });
        }
        return;
      }

      // Criar usuário pendente (sem senha ainda)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).substring(2, 15), // Senha temporária aleatória
        options: {
          emailRedirectTo: `${window.location.origin}/completar-perfil`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está em uso. Tente fazer login ou aguarde aprovação.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      if (data.user) {
        // Marcar perfil como não aprovado
        await supabase
          .from('profiles')
          .update({ approved: false })
          .eq('id', data.user.id);

        toast({
          title: "Cadastro Enviado!",
          description: "Seu cadastro foi enviado para aprovação. Você receberá um email quando for aprovado.",
        });

        // Redirecionar para login
        navigate('/portal/corporativo');
      }

    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
              alt="FFP Advogados" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-ffp-navy">Solicitar Acesso</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para solicitar acesso ao sistema FFP Advogados. Seu cadastro será analisado por um administrador.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-900 font-medium">ℹ️ Processo de Aprovação</p>
              <p className="text-xs text-blue-800 mt-1">
                Após enviar sua solicitação, um administrador irá revisar seu cadastro. Você receberá um email de confirmação quando for aprovado, com instruções para definir sua senha e acessar o sistema.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando solicitação...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Solicitar Acesso
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link to="/portal/corporativo" className="text-ffp-navy hover:underline">
                Faça login
              </Link>
            </p>
            
            <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar ao início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;