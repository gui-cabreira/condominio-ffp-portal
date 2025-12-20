import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Página temporária para criar o usuário admin inicial
// Remover após criar o primeiro admin!
const SetupAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: 'guilherme.cabreira@ffpadvogados.com.br',
    password: '',
    firstName: 'Guilherme',
    lastName: 'Cabreira',
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Criar usuário via signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/corporativo/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Usuário já existe, tentar login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

          if (loginError) throw loginError;

          if (loginData.user) {
            // Atualizar para admin
            await updateToAdmin(loginData.user.id);
            toast({
              title: 'Login realizado!',
              description: 'Você foi promovido a admin.',
            });
            navigate('/portal/corporativo/dashboard');
          }
          return;
        }
        throw authError;
      }

      if (authData.user) {
        // Aguardar trigger criar o perfil
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Atualizar para admin
        await updateToAdmin(authData.user.id);

        toast({
          title: 'Conta admin criada!',
          description: 'Você agora é administrador do sistema.',
        });

        navigate('/portal/corporativo/dashboard');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a conta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateToAdmin = async (userId: string) => {
    // Atualizar perfil
    await supabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Atualizar role para admin
    await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ffp-navy via-ffp-navy to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-ffp-gold/20 p-4 rounded-full">
              <UserPlus className="h-10 w-10 text-ffp-gold" />
            </div>
          </div>
          <CardTitle className="text-2xl text-ffp-navy">Configuração Inicial</CardTitle>
          <CardDescription>
            Crie a conta de administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Nome"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="admin@empresa.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
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
              className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy font-semibold h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Criar Conta Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Atenção:</strong> Esta página deve ser removida após criar o primeiro administrador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;
