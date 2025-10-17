import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Mail, Lock, User, Calendar } from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error loading invitation:', error);
        toast({
          title: "Convite Inválido",
          description: "Este convite não foi encontrado ou já expirou",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (!data) {
        toast({
          title: "Convite Inválido",
          description: "Este convite não foi encontrado ou já expirou",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar convite",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRegistering(true);

      // Criar conta do usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation!.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/corporativo/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Aguardar um pouco para o usuário ser criado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Aceitar o convite usando a função do banco
      const { data: acceptData, error: acceptError } = await supabase
        .rpc('accept_invitation', {
          p_invitation_token: token,
          p_user_id: authData.user.id
        });

      if (acceptError) {
        console.error('Accept invitation error:', acceptError);
        throw acceptError;
      }

      if (!acceptData) {
        throw new Error('Não foi possível aceitar o convite');
      }

      toast({
        title: "Conta Criada com Sucesso!",
        description: `Bem-vindo ao sistema! Você foi cadastrado como ${getRoleName(invitation!.role)}`
      });

      // Redirecionar para o dashboard
      navigate('/portal/corporativo/dashboard');

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao aceitar convite",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      'admin': 'Administrador',
      'employee': 'Funcionário',
      'supervisor': 'Supervisor'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'employee': return 'bg-primary/10 text-primary';
      case 'supervisor': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-16 w-auto"
              />
            </div>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <CardTitle className="text-2xl">Convite Inválido</CardTitle>
            <CardDescription>
              Este convite não foi encontrado ou já expirou
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg border-2">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
              alt="FFP Advogados" 
              className="h-20 w-auto"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Convite para o Sistema</CardTitle>
            <CardDescription className="text-base">
              Você foi convidado para se juntar ao sistema FFP Advogados
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações do Convite */}
          <div className="space-y-3 p-5 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-semibold">{invitation.email}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Perfil:</span>
              <Badge className={getRoleColor(invitation.role)}>
                {getRoleName(invitation.role)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Expira em:</span>
              <span className="text-sm font-semibold">
                {new Date(invitation.expires_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Formulário de Cadastro */}
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Mínimo de 6 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando Conta...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Aceitar Convite e Criar Conta
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;