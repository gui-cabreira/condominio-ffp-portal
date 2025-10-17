import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, UserPlus, RefreshCw, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  approved: boolean;
}

export function PendingUsersApproval() {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [isApproving, setIsApproving] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingUsers((data || []) as PendingUser[]);
    } catch (error: any) {
      console.error('Error loading pending users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUser) return;

    try {
      setIsApproving(true);

      // Buscar informações do admin atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      // Atualizar perfil como aprovado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: currentUser.id
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Criar convite com a role selecionada
      const { error: inviteError } = await supabase
        .functions.invoke('send-user-invitation', {
          body: {
            email: selectedUser.email,
            role: selectedRole,
            invitedBy: currentUser.id,
            isApproval: true // Flag para indicar que é uma aprovação
          }
        });

      if (inviteError) throw inviteError;

      toast({
        title: 'Usuário aprovado!',
        description: `${selectedUser.email} foi aprovado como ${getRoleName(selectedRole)}. Um email de ativação foi enviado.`,
      });

      setApproveDialogOpen(false);
      setSelectedUser(null);
      loadPendingUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: 'Erro ao aprovar usuário',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (user: PendingUser) => {
    if (!confirm(`Tem certeza que deseja rejeitar o cadastro de ${user.email}?`)) {
      return;
    }

    try {
      // Deletar o usuário do auth
      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
      });

      if (deleteError) throw deleteError;

      toast({
        title: 'Cadastro rejeitado',
        description: `O cadastro de ${user.email} foi rejeitado e removido.`,
      });

      loadPendingUsers();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Erro ao rejeitar cadastro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      'admin': 'Administrador',
      'employee': 'Funcionário',
      'supervisor': 'Supervisor',
      'assistant': 'Assistente'
    };
    return roleNames[role] || role;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastros Pendentes de Aprovação
            </CardTitle>
            <CardDescription>
              Usuários que solicitaram acesso ao sistema aguardando aprovação
            </CardDescription>
          </div>
          <Button onClick={loadPendingUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Carregando...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum cadastro pendente</p>
              <p className="text-sm mt-2">Todos os cadastros foram processados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data da Solicitação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pendente
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole('employee');
                          setApproveDialogOpen(true);
                        }}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => handleReject(user)}
                        size="sm"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Cadastro</DialogTitle>
            <DialogDescription>
              Selecione o perfil que será atribuído ao usuário {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Perfil do Usuário</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="assistant">Assistente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O usuário receberá um email com link para definir sua senha e acessar o sistema
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-900 font-medium">ℹ️ Após a aprovação:</p>
              <ul className="text-xs text-blue-800 mt-2 space-y-1">
                <li>• O usuário receberá um email de ativação</li>
                <li>• Ele poderá definir sua senha de acesso</li>
                <li>• Será redirecionado para completar o perfil (onboarding)</li>
                <li>• Terá acesso ao sistema com o perfil selecionado</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false);
                setSelectedUser(null);
              }}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar e Enviar Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}