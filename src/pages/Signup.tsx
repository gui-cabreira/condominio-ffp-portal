import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.email || !formData.password) {
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
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/corporativo/dashboard`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Usuário já existe",
            description: "Este email já está cadastrado. Faça login.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      if (data.user) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta.",
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
          <CardTitle className="text-2xl text-ffp-navy">Criar Conta</CardTitle>
          <CardDescription>
            Cadastre-se para acessar o sistema FFP Advogados
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
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Conta
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