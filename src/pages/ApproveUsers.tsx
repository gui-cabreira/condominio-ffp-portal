import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserCheck, UserX, ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

interface PendingUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  approved: boolean;
}

const ApproveUsers = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários pendentes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários pendentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;

    try {
      // Atualizar perfil para aprovado
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ approved: true })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Chamar edge function para enviar email e atribuir role
      const { error: inviteError } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          userId: selectedUser.id,
          email: selectedUser.email,
          role: selectedRole,
        },
      });

      if (inviteError) throw inviteError;

      toast({
        title: 'Usuário aprovado',
        description: `${selectedUser.email} foi aprovado com sucesso.`,
      });

      setApprovalDialogOpen(false);
      setSelectedUser(null);
      loadPendingUsers();
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (user: PendingUser) => {
    if (!confirm(`Tem certeza que deseja rejeitar o usuário ${user.email}?`)) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast({
        title: 'Usuário rejeitado',
        description: `${user.email} foi removido do sistema.`,
      });

      loadPendingUsers();
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: 'Administrador',
      employee: 'Funcionário',
      supervisor: 'Supervisor',
      assistant: 'Assistente',
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ffp-navy" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/portal/corporativo/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-ffp-navy">Aprovar Usuários</h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Pendentes de Aprovação</CardTitle>
              <CardDescription>
                Aprove ou rejeite novos usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum usuário pendente de aprovação</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Solicitado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedUser(user);
                            setApprovalDialogOpen(true);
                          }}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(user)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar Usuário</DialogTitle>
              <DialogDescription>
                Selecione a função que será atribuída ao usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-2">Usuário:</p>
                <p className="text-sm text-gray-600">
                  {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Função:</p>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="assistant">Assistente</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                Aprovar e Enviar Convite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
};

export default ApproveUsers;
