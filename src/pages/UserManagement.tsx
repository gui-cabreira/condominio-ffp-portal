import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAddress } from '@/hooks/useAddress';
import { UserPlus, Users, Clock, CheckCircle, XCircle, Mail, Shield, User, Calendar, Copy, Edit, Trash2, Eye, MousePointer, TrendingUp, AlertCircle, Search, Loader2, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  birth_date?: string;
  rg?: string;
  cpf?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  property_type?: string;
  created_at: string;
  user_roles: { role: string }[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  email_id?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  complained_at?: string;
  tracking_events?: any[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Removed Azure integration - using only email/password authentication

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'employee'
  });

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    rg: '',
    cpf: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    property_type: '',
    role: 'employee'
  });

  const { fetchAddress, loading: addressLoading } = useAddress();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar usuários com seus roles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          first_name,
          last_name,
          phone,
          birth_date,
          rg,
          cpf,
          zip_code,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          property_type,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Carregar roles dos usuários
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combinar dados dos usuários com seus roles (usar user_id para matching)
      const usersWithRoles = (usersData || []).map(user => ({
        ...user,
        user_roles: (rolesData || []).filter(role => role.user_id === user.user_id).map(role => ({ role: role.role }))
      }));

      // Carregar convites
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      setUsers(usersWithRoles || []);
      setInvitations((invitationsData || []) as Invitation[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.role) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsInviting(true);
      
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: inviteForm.email,
          role: inviteForm.role,
          invitedBy: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Convite Enviado!",
          description: `Convite enviado para ${inviteForm.email} como ${getRoleName(inviteForm.role)}`
        });
        
        setInviteForm({ email: '', role: 'employee' });
        setInviteDialogOpen(false);
        loadData();
      } else {
        throw new Error(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar convite",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      birth_date: user.birth_date || '',
      rg: user.rg || '',
      cpf: user.cpf || '',
      zip_code: user.zip_code || '',
      street: user.street || '',
      number: user.number || '',
      complement: user.complement || '',
      neighborhood: user.neighborhood || '',
      city: user.city || '',
      state: user.state || '',
      property_type: user.property_type || '',
      role: user.user_roles[0]?.role || 'employee'
    });
    setEditDialogOpen(true);
  };

  const handleCepSearch = async () => {
    if (editForm.zip_code.replace(/\D/g, '').length === 8) {
      const data = await fetchAddress(editForm.zip_code);
      if (data) {
        setEditForm(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const userId = editingUser.user_id || editingUser.id;

      // Atualizar perfil (usar user_id para compatibilidade com RLS)
      const { data: updatedProfiles, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          birth_date: editForm.birth_date || null,
          rg: editForm.rg,
          cpf: editForm.cpf,
          zip_code: editForm.zip_code,
          street: editForm.street,
          number: editForm.number,
          complement: editForm.complement,
          neighborhood: editForm.neighborhood,
          city: editForm.city,
          state: editForm.state,
          property_type: editForm.property_type,
        } as any)
        .eq('user_id', userId)
        .select('id');

      if (profileError) throw profileError;
      if (!updatedProfiles || updatedProfiles.length === 0) {
        throw new Error('Não foi possível atualizar o perfil (sem permissão ou registro não encontrado).');
      }

      // Atualizar role (UPDATE ao invés de DELETE + INSERT)
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editForm.role as any })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });

      setEditDialogOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar usuário',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      // Chamar edge function para deletar usuário completamente
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar usuário');
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso do sistema'
      });

      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir usuário',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Tem certeza que deseja deletar este convite?')) return;

    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Convite Deletado',
        description: 'O convite foi removido com sucesso'
      });

      loadData();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar convite',
        variant: 'destructive'
      });
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    if (!confirm(`Deseja reenviar o convite para ${invitation.email}? Um novo email será enviado com um novo link.`)) return;

    try {
      setResendingInvitation(invitation.id);
      
      // Deletar convite antigo
      const { error: deleteError } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id);

      if (deleteError) throw deleteError;

      // Criar novo convite
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: invitation.email,
          role: invitation.role,
          invitedBy: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Convite Reenviado!",
          description: `Novo convite enviado para ${invitation.email}`
        });
        loadData();
      } else {
        throw new Error(data.error || 'Erro ao reenviar convite');
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao reenviar convite',
        variant: 'destructive'
      });
    } finally {
      setResendingInvitation(null);
    }
  };

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/aceitar-convite?token=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: "Link Copiado!",
      description: "Link do convite copiado para a área de transferência"
    });
  };

  const calculateTimeDiff = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      'admin': 'Administrador',
      'assistant': 'Assistente',
      'employee': 'Funcionário',
      'supervisor': 'Supervisor'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'assistant': return 'bg-purple-100 text-purple-800';
      case 'employee': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return { text: 'Aceito', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    
    if (new Date(invitation.expires_at) < new Date()) {
      return { text: 'Expirado', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
    
    return { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 md:h-8 md:w-8" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Envie um convite por email para um novo usuário se juntar ao sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Perfil *</Label>
                <select
                  id="role"
                  className="w-full p-2 border rounded-md bg-background"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  required
                >
                  <option value="admin">Administrador</option>
                  <option value="assistant">Assistente</option>
                  <option value="employee">Funcionário</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {inviteForm.role === 'admin' && 'Acesso total ao sistema - contabilização, validação e aprovação de acordos'}
                  {inviteForm.role === 'assistant' && 'Baixar arquivos, processar com IA, criar cobranças e disparar e-mails/WhatsApp'}
                  {inviteForm.role === 'employee' && 'Pode enviar cobranças e acompanhar pagamentos'}
                  {inviteForm.role === 'supervisor' && 'Pode visualizar relatórios e dados'}
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Convite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Edite as informações do usuário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name">Nome</Label>
                  <Input
                    id="edit_first_name"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_last_name">Sobrenome</Label>
                  <Input
                    id="edit_last_name"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_phone">Telefone</Label>
                  <Input
                    id="edit_phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                  <Input
                    id="edit_birth_date"
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_cpf">CPF</Label>
                  <Input
                    id="edit_cpf"
                    value={editForm.cpf}
                    onChange={(e) => setEditForm({ ...editForm, cpf: formatCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_rg">RG</Label>
                  <Input
                    id="edit_rg"
                    value={editForm.rg}
                    onChange={(e) => setEditForm({ ...editForm, rg: e.target.value })}
                    placeholder="00.000.000-0"
                  />
                </div>
              </div>

              {/* Tipo de Imóvel */}
              <div>
                <Label htmlFor="edit_property_type">Tipo de Imóvel</Label>
                <select
                  id="edit_property_type"
                  className="w-full p-2 border rounded-md bg-background"
                  value={editForm.property_type}
                  onChange={(e) => setEditForm({ ...editForm, property_type: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="sala_comercial">Sala Comercial</option>
                  <option value="loja">Loja</option>
                  <option value="galpao">Galpão</option>
                  <option value="terreno">Terreno</option>
                  <option value="sitio">Sítio/Fazenda</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* CEP com busca automática */}
              <div>
                <Label htmlFor="edit_zip_code">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_zip_code"
                    value={editForm.zip_code}
                    onChange={(e) => setEditForm({ ...editForm, zip_code: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCepSearch}
                    disabled={addressLoading || editForm.zip_code.replace(/\D/g, '').length !== 8}
                  >
                    {addressLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite o CEP e clique na lupa para buscar o endereço
                </p>
              </div>

              {/* Rua */}
              <div>
                <Label htmlFor="edit_street">Rua/Logradouro</Label>
                <Input
                  id="edit_street"
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  placeholder="Nome da rua"
                />
              </div>

              {/* Número e Complemento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_number">Número *</Label>
                  <Input
                    id="edit_number"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    placeholder="123"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_complement">Complemento</Label>
                  <Input
                    id="edit_complement"
                    value={editForm.complement}
                    onChange={(e) => setEditForm({ ...editForm, complement: e.target.value })}
                    placeholder="Apto 101, Bloco A (opcional)"
                  />
                </div>
              </div>

              {/* Bairro e Cidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_neighborhood">Bairro</Label>
                  <Input
                    id="edit_neighborhood"
                    value={editForm.neighborhood}
                    onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_city">Cidade</Label>
                  <Input
                    id="edit_city"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_state">Estado</Label>
                <select
                  id="edit_state"
                  className="w-full p-2 border rounded-md bg-background"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="edit_role">Perfil *</Label>
                <select
                  id="edit_role"
                  className="w-full p-2 border rounded-md bg-background"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  required
                >
                  <option value="admin">Administrador</option>
                  <option value="assistant">Assistente</option>
                  <option value="employee">Funcionário</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Enviados</CardTitle>
            <Mail className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invitations.filter(inv => inv.email_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Emails enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Abertos</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {invitations.filter(inv => inv.opened_at).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa: {invitations.filter(inv => inv.email_id).length > 0 ? 
                Math.round((invitations.filter(inv => inv.opened_at).length / invitations.filter(inv => inv.email_id).length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Aceitos</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {invitations.filter(inv => inv.accepted_at).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(user => user.user_roles.some(role => role.role === 'admin')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com acesso total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Convites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Cadastrados</CardTitle>
              <CardDescription>
                Lista de todos os usuários com acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-32rem)] w-full">
                <div className="pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : 'Nome não informado'
                            }
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.user_roles.map((roleObj, index) => (
                                <Badge key={index} className={getRoleColor(roleObj.role)}>
                                  {getRoleName(roleObj.role)}
                                </Badge>
                              ))}
                              {user.user_roles.length === 0 && (
                                <Badge variant="outline">Sem perfil</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Convites Enviados</CardTitle>
              <CardDescription>
                Histórico de convites com tracking completo de engajamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-32rem)] w-full">
                <div className="pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status do Email</TableHead>
                        <TableHead>Status do Convite</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => {
                        const status = getInvitationStatus(invitation);
                        const StatusIcon = status.icon;
                        
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(invitation.role)}>
                                {getRoleName(invitation.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {invitation.email_id ? (
                                  <>
                                    <Badge variant="outline" className="gap-1 w-fit">
                                      <Mail className="h-3 w-3" />
                                      Enviado
                                    </Badge>
                                    {invitation.delivered_at && (
                                      <Badge variant="outline" className="gap-1 w-fit bg-green-50">
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                        Entregue
                                      </Badge>
                                    )}
                                    {invitation.opened_at && (
                                      <Badge className="gap-1 w-fit bg-blue-500">
                                        <Eye className="h-3 w-3" />
                                        Aberto
                                      </Badge>
                                    )}
                                    {invitation.clicked_at && (
                                      <Badge className="gap-1 w-fit bg-green-500">
                                        <MousePointer className="h-3 w-3" />
                                        Clicado
                                      </Badge>
                                    )}
                                    {invitation.bounced_at && (
                                      <Badge variant="destructive" className="gap-1 w-fit">
                                        <AlertCircle className="h-3 w-3" />
                                        Bounce
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline">Não enviado</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.text}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(invitation.created_at).toLocaleDateString('pt-BR')}
                                <div className="text-xs text-muted-foreground">
                                  {new Date(invitation.created_at).toLocaleTimeString('pt-BR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedInvitation(invitation);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detalhes
                                </Button>
                                {!invitation.accepted_at && (
                                  <>
                                    {new Date(invitation.expires_at) > new Date() && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyInvitationLink(invitation.invitation_token)}
                                        title="Copiar link"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleResendInvitation(invitation)}
                                      disabled={resendingInvitation === invitation.id}
                                      title="Reenviar convite"
                                    >
                                      {resendingInvitation === invitation.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                  title="Excluir convite"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes do Convite */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detalhes do Convite
            </DialogTitle>
            <DialogDescription>
              Timeline completa e estatísticas de engajamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvitation && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informações do Convite</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedInvitation.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Perfil</p>
                    <Badge className={getRoleColor(selectedInvitation.role)}>
                      {getRoleName(selectedInvitation.role)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(selectedInvitation.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expira em</p>
                    <p className="font-medium">
                      {new Date(selectedInvitation.expires_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {selectedInvitation.email_id && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Email ID (Resend)</p>
                      <p className="font-mono text-xs bg-muted p-2 rounded">
                        {selectedInvitation.email_id}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline de Eventos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Timeline de Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-l-2 border-muted pl-4 space-y-4">
                    {selectedInvitation.sent_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <Mail className="h-4 w-4 mt-1 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Email Enviado</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.sent_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedInvitation.delivered_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <CheckCircle className="h-4 w-4 mt-1 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Email Entregue</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.delivered_at).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tempo até entrega: {calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.delivered_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedInvitation.opened_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-blue-500 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <Eye className="h-4 w-4 mt-1 text-blue-600" />
                          <div className="flex-1">
                            <p className="font-medium">Email Aberto</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.opened_at).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tempo até abertura: {calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.opened_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedInvitation.clicked_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-purple-500 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <MousePointer className="h-4 w-4 mt-1 text-purple-600" />
                          <div className="flex-1">
                            <p className="font-medium">Link Clicado</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.clicked_at).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tempo até clique: {calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.clicked_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedInvitation.accepted_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-green-600 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <CheckCircle className="h-4 w-4 mt-1 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium">Convite Aceito</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.accepted_at).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tempo até aceitação: {calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.accepted_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedInvitation.bounced_at && (
                      <div className="relative">
                        <div className="absolute -left-[21px] h-3 w-3 rounded-full bg-red-500 border-2 border-background"></div>
                        <div className="flex gap-2 items-start">
                          <AlertCircle className="h-4 w-4 mt-1 text-red-600" />
                          <div className="flex-1">
                            <p className="font-medium">Email Retornou (Bounce)</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(selectedInvitation.bounced_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!selectedInvitation.sent_at && (
                      <div className="text-muted-foreground text-sm">
                        Nenhum evento registrado ainda
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas */}
              {selectedInvitation.email_id && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-blue-900">
                      📊 Estatísticas de Engajamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedInvitation.delivered_at ? 
                          calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.delivered_at) : 
                          '-'
                        }
                      </p>
                      <p className="text-xs text-blue-800">Tempo até entrega</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedInvitation.opened_at ? 
                          calculateTimeDiff(selectedInvitation.sent_at, selectedInvitation.opened_at) : 
                          '-'
                        }
                      </p>
                      <p className="text-xs text-blue-800">Tempo até abertura</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedInvitation.opened_at ? '100%' : '0%'}
                      </p>
                      <p className="text-xs text-blue-800">Taxa de abertura</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default UserManagement;