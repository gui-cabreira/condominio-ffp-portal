import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cpf: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.email || !formData.cpf) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!lgpdConsent) {
      toast({
        title: "Consentimento necessário",
        description: "Você precisa concordar com a Política de Privacidade e Termos de Uso para continuar",
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
        // Marcar perfil como não aprovado e salvar consentimento LGPD
        await supabase
          .from('profiles')
          .update({ 
            approved: false,
            lgpd_consent: lgpdConsent,
            lgpd_consent_date: new Date().toISOString()
          })
          .eq('id', data.user.id);

        toast({
          title: "Cadastro Enviado!",
          description: "Seu cadastro foi enviado. Verifique seu email para completar o processo.",
        });

        // Redirecionar para portal do cliente
        navigate('/portal');
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

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Usaremos seu CPF para verificar se você possui cobranças cadastradas
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
              <Checkbox 
                id="lgpd-consent" 
                checked={lgpdConsent}
                onCheckedChange={(checked) => setLgpdConsent(checked as boolean)}
                required
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="lgpd-consent" className="text-sm font-normal cursor-pointer">
                  Autorizo o recebimento de comunicações por e-mail, SMS e WhatsApp relacionadas às minhas cobranças e acordos. Li e concordo com a{' '}
                  <a href="/politica-privacidade" className="text-ffp-navy underline hover:text-ffp-gold" target="_blank">
                    Política de Privacidade
                  </a>
                  {' '}e os{' '}
                  <a href="/termos-uso" className="text-ffp-navy underline hover:text-ffp-gold" target="_blank">
                    Termos de Uso
                  </a>
                  {' '}conforme a LGPD. *
                </Label>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-900 font-medium">ℹ️ Portal do Cliente</p>
              <p className="text-xs text-amber-800 mt-1">
                Este é o cadastro para o Portal do Cliente FFP Advogados. Se você é um colaborador da empresa, use o{' '}
                <Link to="/portal/corporativo/login" className="underline font-semibold">
                  Portal Corporativo
                </Link>.
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