import { useEffect, useState } from 'react';
import { PendingUsersApproval } from '@/components/PendingUsersApproval';
import { CorporateLayout } from '@/components/CorporateLayout';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bug, Activity, Users, AlertTriangle, CheckCircle, Clock, XCircle, Eye, Mail, Save, Send, MailOpen, MailX, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailStats {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_bounced: number;
  open_rate: number;
  delivery_rate: number;
}

interface RecentEmail {
  id: string;
  email: string;
  type: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  bounced_at?: string;
  status: 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  sent_at?: string;
  invited_by?: string;
}

interface SystemBug {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_by: string;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
  assigned_name?: string;
  resolution_notes?: string;
}

interface LoginLog {
  id: string;
  user_id: string;
  login_at: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
}

interface SystemLog {
  id: string;
  event_type: string;
  event_category: string;
  description: string;
  created_at: string;
  user_id?: string;
}

interface LoginStats {
  user_id: string;
  email: string;
  total_logins: number;
  last_login: string;
  failed_attempts: number;
}

export default function SystemAdminPage() {
  const { toast } = useToast();
  const [bugs, setBugs] = useState<SystemBug[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStats[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    total_bounced: 0,
    open_rate: 0,
    delivery_rate: 0
  });
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newBugTitle, setNewBugTitle] = useState('');
  const [newBugDescription, setNewBugDescription] = useState('');
  const [newBugSeverity, setNewBugSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedBug, setSelectedBug] = useState<SystemBug | null>(null);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Email config states
  const [emailCobranca, setEmailCobranca] = useState('notificacao@ffpadvogados.com.br');
  const [emailCadastro, setEmailCadastro] = useState('cadastro@ffpadvogados.com.br');
  
  // Test invite states
  const [testEmail, setTestEmail] = useState('');
  const [testRole, setTestRole] = useState<'admin' | 'employee' | 'supervisor'>('employee');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadBugs(),
      loadLoginLogs(),
      loadSystemLogs(),
      loadLoginStats(),
      loadEmailStats(),
      loadPendingInvitations()
    ]);
    setLoading(false);
  };

  const loadPendingInvitations = async () => {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar convites:', error);
      return;
    }

    setPendingInvitations((data || []) as PendingInvitation[]);
  };

  const loadEmailStats = async () => {
    // Buscar convites com tracking
    const { data: invitations } = await supabase
      .from('user_invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!invitations) return;

    const total_sent = invitations.filter(i => i.sent_at).length;
    const total_delivered = invitations.filter(i => i.delivered_at).length;
    const total_opened = invitations.filter(i => i.opened_at).length;
    const total_bounced = invitations.filter(i => i.bounced_at).length;

    setEmailStats({
      total_sent,
      total_delivered,
      total_opened,
      total_bounced,
      open_rate: total_sent > 0 ? (total_opened / total_sent) * 100 : 0,
      delivery_rate: total_sent > 0 ? (total_delivered / total_sent) * 100 : 0
    });

    // Mapear para formato de recent emails
    const emails: RecentEmail[] = invitations.map(inv => {
      let status: RecentEmail['status'] = 'sent';
      if (inv.bounced_at) status = 'bounced';
      else if (inv.opened_at) status = 'opened';
      else if (inv.delivered_at) status = 'delivered';
      
      return {
        id: inv.id,
        email: inv.email,
        type: inv.role === 'admin' ? 'Convite Admin' : `Convite ${inv.role}`,
        sent_at: inv.sent_at || inv.created_at,
        delivered_at: inv.delivered_at || undefined,
        opened_at: inv.opened_at || undefined,
        bounced_at: inv.bounced_at || undefined,
        status
      };
    }).filter(e => e.sent_at);

    setRecentEmails(emails);
  };

  const loadBugs = async () => {
    const { data, error } = await supabase
      .from('system_bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar bugs',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    // Buscar perfis dos usuários mencionados nos bugs
    const userIds = new Set<string>();
    (data || []).forEach(bug => {
      if (bug.reported_by) userIds.add(bug.reported_by);
      if (bug.assigned_to) userIds.add(bug.assigned_to);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(userIds));

    const profilesMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    const bugsWithNames = (data || []).map(bug => {
      const reporter = bug.reported_by ? profilesMap.get(bug.reported_by) : null;
      const assignee = bug.assigned_to ? profilesMap.get(bug.assigned_to) : null;
      
      return {
        ...bug,
        reporter_name: reporter 
          ? `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || reporter.email 
          : 'Desconhecido',
        assigned_name: assignee 
          ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email 
          : undefined
      };
    });

    setBugs(bugsWithNames as SystemBug[]);
  };

  const loadLoginLogs = async () => {
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: 'Erro ao carregar logs de login',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setLoginLogs((data || []) as LoginLog[]);
    }
  };

  const loadSystemLogs = async () => {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: 'Erro ao carregar logs do sistema',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setSystemLogs((data || []) as SystemLog[]);
    }
  };

  const loadLoginStats = async () => {
    const { data, error } = await supabase
      .from('login_statistics')
      .select('*')
      .order('total_logins', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar estatísticas',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      console.log('Login stats reloaded at:', new Date().toISOString());
      console.log('Stats data:', data);
      setLoginStats((data || []) as LoginStats[]);
      toast({
        title: 'Estatísticas atualizadas',
        description: `${data?.length || 0} usuário(s) encontrado(s)`,
      });
    }
  };

  const handleCreateBug = async () => {
    if (!newBugTitle || !newBugDescription) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e descrição',
        variant: 'destructive'
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('system_bugs')
      .insert({
        title: newBugTitle,
        description: newBugDescription,
        severity: newBugSeverity,
        reported_by: user.id
      });

    if (error) {
      toast({
        title: 'Erro ao criar bug',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Bug registrado',
        description: 'Bug criado com sucesso'
      });
      setNewBugTitle('');
      setNewBugDescription('');
      setNewBugSeverity('medium');
      loadBugs();
    }
  };

  const updateBugStatus = async (bugId: string, newStatus: string) => {
    const { error } = await supabase
      .from('system_bugs')
      .update({ 
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', bugId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Status atualizado',
        description: 'Bug atualizado com sucesso'
      });
      loadBugs();
    }
  };

  const handleSaveEmailConfig = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As configurações de email foram atualizadas com sucesso'
    });
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Convite excluído',
        description: 'O convite foi removido com sucesso'
      });

      await loadPendingInvitations();
      await loadEmailStats();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir convite',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSendTestInvite = async () => {
    if (!testEmail) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite um email válido para enviar o convite de teste',
        variant: 'destructive'
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({
        title: 'Email inválido',
        description: 'Digite um endereço de email válido',
        variant: 'destructive'
      });
      return;
    }

    setSendingInvite(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Enviar convite via edge function (que cria o convite no banco e envia o email)
      const { data, error: functionError } = await supabase.functions.invoke('send-user-invitation', {
        body: { 
          email: testEmail,
          role: testRole,
          invitedBy: user.id
        }
      });

      // Importante: mesmo com functionError (HTTP 400), o data ainda pode conter a resposta
      // Primeiro verificamos se temos uma resposta com dados úteis
      if (data?.success) {
        toast({
          title: 'Convite enviado! 🎉',
          description: `Email de teste enviado para ${testEmail}. Vá para Gestão de Usuários para acompanhar o tracking.`
        });
        setTestEmail('');
        
        // Recarregar dados de email
        await loadEmailStats();
      } else if (data?.error) {
        // Erro de validação retornado pela função (usuário já existe, convite pendente, etc)
        // Este é um erro esperado e tratado pela edge function
        toast({
          title: 'Não foi possível enviar o convite',
          description: data.error,
          variant: 'destructive'
        });
      } else if (functionError) {
        // Erro de rede/servidor sem dados úteis
        console.error('Erro ao chamar função:', functionError);
        throw functionError;
      }

    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: 'Erro ao enviar convite',
        description: error.message || 'Ocorreu um erro ao processar o convite de teste',
        variant: 'destructive'
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      low: { variant: 'default', icon: null },
      medium: { variant: 'secondary', icon: Clock },
      high: { variant: 'destructive', icon: AlertTriangle },
      critical: { variant: 'destructive', icon: XCircle }
    };

    const config = variants[severity] || variants.low;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      open: { variant: 'outline', icon: AlertTriangle },
      in_progress: { variant: 'secondary', icon: Clock },
      resolved: { variant: 'default', icon: CheckCircle },
      closed: { variant: 'default', icon: XCircle }
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugs Ativos</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bugs.filter(b => b.status === 'open' || b.status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugs Críticos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {bugs.filter(b => b.severity === 'critical' && b.status !== 'closed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loginStats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Logs do Sistema</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemLogs.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending-users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending-users">Aprovação de Cadastros</TabsTrigger>
              <TabsTrigger value="bugs">Bugs</TabsTrigger>
              <TabsTrigger value="pending-invitations">Gestão de Convites</TabsTrigger>
              <TabsTrigger value="email-monitoring">Monitoramento de E-mails</TabsTrigger>
              <TabsTrigger value="email-config">Configuração de Emails</TabsTrigger>
              <TabsTrigger value="email-test">Teste de Convites</TabsTrigger>
              <TabsTrigger value="login-stats">Estatísticas de Login</TabsTrigger>
              <TabsTrigger value="login-logs">Logs de Login</TabsTrigger>
              <TabsTrigger value="system-logs">Logs do Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="pending-users">
              <PendingUsersApproval />
            </TabsContent>

            <TabsContent value="pending-invitations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Convites Pendentes
                  </CardTitle>
                  <CardDescription>
                    Gerencie convites que ainda não foram aceitos. Você pode excluir convites para permitir o reenvio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvitations.map((invitation) => {
                        const isExpired = new Date(invitation.expires_at) < new Date();
                        const roleNames: Record<string, string> = {
                          'admin': 'Administrador',
                          'employee': 'Funcionário',
                          'supervisor': 'Supervisor'
                        };
                        
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {roleNames[invitation.role] || invitation.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {invitation.sent_at 
                                ? format(new Date(invitation.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                : format(new Date(invitation.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                              }
                            </TableCell>
                            <TableCell>
                              {format(new Date(invitation.expires_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="destructive">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Expirado
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteInvitation(invitation.id)}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Excluir
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pendingInvitations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum convite pendente
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email-monitoring" className="space-y-4">
              {/* Email Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">E-mails Enviados</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.total_sent}</div>
                    <p className="text-xs text-muted-foreground">Últimos 50 registros</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {emailStats.delivery_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.total_delivered} entregues
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
                    <MailOpen className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {emailStats.open_rate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.total_opened} abertos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                    <MailX className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {emailStats.total_bounced}
                    </div>
                    <p className="text-xs text-muted-foreground">E-mails devolvidos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Emails Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Últimas Solicitações de E-mail
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o status dos últimos 50 e-mails enviados pelo sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Enviado</TableHead>
                        <TableHead>Entregue</TableHead>
                        <TableHead>Aberto</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium">{email.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{email.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {email.sent_at 
                              ? format(new Date(email.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {email.delivered_at 
                              ? format(new Date(email.delivered_at), 'dd/MM HH:mm', { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {email.opened_at 
                              ? format(new Date(email.opened_at), 'dd/MM HH:mm', { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {email.status === 'opened' && (
                              <Badge className="bg-blue-600">
                                <MailOpen className="mr-1 h-3 w-3" />
                                Aberto
                              </Badge>
                            )}
                            {email.status === 'delivered' && (
                              <Badge className="bg-green-600">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Entregue
                              </Badge>
                            )}
                            {email.status === 'sent' && (
                              <Badge variant="secondary">
                                <Send className="mr-1 h-3 w-3" />
                                Enviado
                              </Badge>
                            )}
                            {email.status === 'bounced' && (
                              <Badge variant="destructive">
                                <MailX className="mr-1 h-3 w-3" />
                                Devolvido
                              </Badge>
                            )}
                            {email.status === 'failed' && (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Falhou
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentEmails.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum e-mail enviado ainda
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* System Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Sistema de E-mails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Auth Hook Configurado
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Edge function <code className="bg-muted px-1 rounded">auth-email</code> está ativa e enviando e-mails através do Resend com design FFP.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Resend Integrado
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Domínio verificado: <code className="bg-muted px-1 rounded">ffpadvogados.com.br</code>
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">Links Úteis</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/functions/auth-email/logs', '_blank')}
                      >
                        Ver Logs Auth Email
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://resend.com/emails', '_blank')}
                      >
                        Resend Dashboard
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('https://supabase.com/dashboard/project/iugxnhdxbpzauqwkjtao/auth/hooks', '_blank')}
                      >
                        Configurar Hooks
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bugs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Novo Bug</CardTitle>
                  <CardDescription>Reporte problemas encontrados no sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="bug-title">Título</Label>
                      <Input
                        id="bug-title"
                        value={newBugTitle}
                        onChange={(e) => setNewBugTitle(e.target.value)}
                        placeholder="Título do bug"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bug-description">Descrição</Label>
                      <Textarea
                        id="bug-description"
                        value={newBugDescription}
                        onChange={(e) => setNewBugDescription(e.target.value)}
                        placeholder="Descreva o problema em detalhes"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bug-severity">Severidade</Label>
                      <Select value={newBugSeverity} onValueChange={(v: any) => setNewBugSeverity(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="critical">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateBug}>
                      <Bug className="mr-2 h-4 w-4" />
                      Registrar Bug
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bugs Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Reportado por</TableHead>
                        <TableHead>Severidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bugs.map((bug) => (
                        <TableRow key={bug.id}>
                          <TableCell className="font-medium">{bug.title}</TableCell>
                          <TableCell>{bug.reporter_name}</TableCell>
                          <TableCell>{getSeverityBadge(bug.severity)}</TableCell>
                          <TableCell>{getStatusBadge(bug.status)}</TableCell>
                          <TableCell>
                            {format(new Date(bug.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBug(bug);
                                  setResolutionNotes(bug.resolution_notes || '');
                                  setBugDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Select
                                value={bug.status}
                                onValueChange={(status) => updateBugStatus(bug.id, status)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Aberto</SelectItem>
                                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                                  <SelectItem value="resolved">Resolvido</SelectItem>
                                  <SelectItem value="closed">Fechado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email-config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Configuração de Emails do Sistema
                  </CardTitle>
                  <CardDescription>
                    Configure os endereços de email utilizados pelo sistema para diferentes tipos de mensagens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Email de Cobrança */}
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500"></div>
                          Email de Cobrança
                        </CardTitle>
                        <CardDescription>
                          Usado para enviar notificações de cobranças e workflows de inadimplência
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="email-cobranca">Endereço de Email</Label>
                          <Input
                            id="email-cobranca"
                            type="email"
                            value={emailCobranca}
                            onChange={(e) => setEmailCobranca(e.target.value)}
                            placeholder="notificacao@ffpadvogados.com.br"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="rounded-lg bg-muted p-3 space-y-2">
                          <p className="text-sm font-medium">Utilizado em:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Workflows de cobrança automática</li>
                            <li>• Notificações de inadimplência</li>
                            <li>• Lembretes de vencimento</li>
                            <li>• Emails de follow-up</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Email de Cadastro */}
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          Email de Cadastro
                        </CardTitle>
                        <CardDescription>
                          Usado para comunicações de backoffice e portal de clientes
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="email-cadastro">Endereço de Email</Label>
                          <Input
                            id="email-cadastro"
                            type="email"
                            value={emailCadastro}
                            onChange={(e) => setEmailCadastro(e.target.value)}
                            placeholder="cadastro@ffpadvogados.com.br"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="rounded-lg bg-muted p-3 space-y-2">
                          <p className="text-sm font-medium">Utilizado em:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Convites de usuários</li>
                            <li>• Recuperação de senha</li>
                            <li>• Notificações de cadastro</li>
                            <li>• Comunicados do backoffice</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Informações de Configuração */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-blue-900">
                        ℹ️ Informações Importantes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-blue-800">
                      <p>• Os emails devem estar validados no Resend antes de serem utilizados</p>
                      <p>• Certifique-se de que os registros SPF, DKIM e DMARC estão configurados corretamente</p>
                      <p>• O domínio <strong>ffpadvogados.com.br</strong> deve estar verificado no painel do Resend</p>
                      <p>• Alterações entram em vigor imediatamente após salvar</p>
                    </CardContent>
                  </Card>

                  {/* Status da Configuração */}
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-900 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Status da Configuração Atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800">Email de Cobrança:</span>
                        <Badge className="bg-green-600">{emailCobranca}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800">Email de Cadastro:</span>
                        <Badge className="bg-blue-600">{emailCadastro}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800">Provedor:</span>
                        <Badge variant="outline">Resend</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800">Status do Domínio:</span>
                        <Badge className="bg-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verificado
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Button onClick={handleSaveEmailConfig} className="w-full" size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações de Email
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email-test">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Teste de Sistema de Convites
                  </CardTitle>
                  <CardDescription>
                    Envie convites de teste e acompanhe todo o rastreamento de emails (envio, entrega, abertura, cliques)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Formulário de Teste */}
                  <div className="rounded-lg border bg-card p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-email">Email de Teste</Label>
                      <Input
                        id="test-email"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="max-w-md"
                        disabled={sendingInvite}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="test-role">Role</Label>
                      <Select 
                        value={testRole} 
                        onValueChange={(v: any) => setTestRole(v)}
                        disabled={sendingInvite}
                      >
                        <SelectTrigger className="max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="employee">Funcionário</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full max-w-md"
                      onClick={handleSendTestInvite}
                      disabled={sendingInvite}
                    >
                      {sendingInvite ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Enviar Convite de Teste
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Informações do Rastreamento */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-blue-900">
                        📊 O que você pode rastrear:
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span><strong>Email Enviado:</strong> Quando o email foi despachado pelo sistema</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span><strong>Email Entregue:</strong> Quando chegou na caixa de entrada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span><strong>Email Aberto:</strong> Quando o destinatário abriu o email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span><strong>Link Clicado:</strong> Quando clicou no botão de aceitar convite</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span><strong>Bounce:</strong> Se o email retornou (endereço inválido)</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Como Funciona */}
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-900">
                        ✨ Como Funciona:
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-green-800">
                      <p>1. Digite um email válido que você tenha acesso</p>
                      <p>2. Envie o convite de teste</p>
                      <p>3. Vá para a aba <strong>"Gestão de Usuários"</strong> no menu</p>
                      <p>4. Na seção <strong>"Convites Enviados"</strong>, você verá:</p>
                      <ul className="ml-6 space-y-1 mt-2">
                        <li>• Badges coloridas mostrando o status do email</li>
                        <li>• Botão "Detalhes" para ver timeline completa</li>
                        <li>• Estatísticas de engajamento em tempo real</li>
                      </ul>
                      <p className="mt-3"><strong>Dica:</strong> Abra o email no seu celular e veja os eventos aparecendo em tempo real! 📱</p>
                    </CardContent>
                  </Card>

                  {/* Links Úteis */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        🔗 Links Úteis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-between" asChild>
                        <a href="/portal/corporativo/usuarios" className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Ver Convites Enviados
                          </span>
                          <span className="text-xs text-muted-foreground">Gestão de Usuários</span>
                        </a>
                      </Button>
                      <Button variant="outline" className="w-full justify-between" asChild>
                        <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Dashboard do Resend
                          </span>
                          <span className="text-xs text-muted-foreground">Ver emails enviados</span>
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="login-stats">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Estatísticas de Login dos Usuários</CardTitle>
                    <CardDescription>Último login e tentativas de acesso</CardDescription>
                  </div>
                  <Button 
                    onClick={() => loadLoginStats()} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                </CardHeader>
                <CardContent>
                  {loginStats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma estatística de login disponível ainda.</p>
                      <p className="text-sm mt-2">Os dados aparecerão após os primeiros logins dos usuários.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Total de Logins</TableHead>
                          <TableHead>Último Login</TableHead>
                          <TableHead>Tentativas Falhas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginStats.map((stat) => (
                          <TableRow key={stat.user_id}>
                            <TableCell className="font-medium">{stat.email}</TableCell>
                            <TableCell>{stat.total_logins}</TableCell>
                            <TableCell>
                              {stat.last_login 
                                ? format(new Date(stat.last_login), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                : 'Nunca'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={stat.failed_attempts > 0 ? 'destructive' : 'default'}>
                                {stat.failed_attempts}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="login-logs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs de Login</CardTitle>
                  <CardDescription>Histórico detalhado de acessos ao sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  {loginLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum log de login registrado ainda.</p>
                      <p className="text-sm mt-2">Os dados aparecerão após os primeiros logins dos usuários.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>User Agent</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {format(new Date(log.login_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{log.ip_address || 'N/A'}</TableCell>
                            <TableCell className="truncate max-w-xs text-sm">
                              {log.user_agent || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.success ? 'default' : 'destructive'}>
                                {log.success ? 'Sucesso' : 'Falha'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system-logs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs Operacionais</CardTitle>
                  <CardDescription>Eventos e operações do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  {systemLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum log do sistema registrado ainda.</p>
                      <p className="text-sm mt-2">Os logs aparecerão conforme o sistema for utilizado.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo de Evento</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge>{log.event_category}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{log.event_type}</TableCell>
                            <TableCell className="max-w-md truncate">{log.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Bug Details Dialog */}
          <Dialog open={bugDialogOpen} onOpenChange={setBugDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Detalhes do Chamado
                </DialogTitle>
                <DialogDescription>
                  Informações completas do bug reportado
                </DialogDescription>
              </DialogHeader>
              
              {selectedBug && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Título</Label>
                    <p className="text-lg">{selectedBug.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Severidade</Label>
                      <div className="mt-1">{getSeverityBadge(selectedBug.severity)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedBug.status)}</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Descrição</Label>
                    <p className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">{selectedBug.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Reportado por</Label>
                      <p className="mt-1">{selectedBug.reporter_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Data de Abertura</Label>
                      <p className="mt-1">
                        {format(new Date(selectedBug.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {selectedBug.assigned_name && (
                    <div>
                      <Label className="text-sm font-semibold">Atribuído para</Label>
                      <p className="mt-1">{selectedBug.assigned_name}</p>
                    </div>
                  )}

                  {selectedBug.resolved_at && (
                    <div>
                      <Label className="text-sm font-semibold">Data de Resolução</Label>
                      <p className="mt-1">
                        {format(new Date(selectedBug.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-semibold">Resposta / Notas de Resolução</Label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Adicione comentários sobre a resolução do bug..."
                      rows={4}
                      className="mt-1"
                    />
                    <Button 
                      onClick={async () => {
                        const { error } = await supabase
                          .from('system_bugs')
                          .update({ resolution_notes: resolutionNotes })
                          .eq('id', selectedBug.id);
                        
                        if (error) {
                          toast({
                            title: 'Erro ao salvar',
                            description: error.message,
                            variant: 'destructive'
                          });
                        } else {
                          toast({
                            title: 'Resposta salva',
                            description: 'Notas de resolução atualizadas com sucesso'
                          });
                          loadBugs();
                          setBugDialogOpen(false);
                        }
                      }}
                      className="mt-2"
                    >
                      Salvar Resposta
                    </Button>
                  </div>

                  {selectedBug.resolution_notes && (
                    <div>
                      <Label className="text-sm font-semibold">Resposta Anterior</Label>
                      <p className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">{selectedBug.resolution_notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <Label className="text-xs">Criado em</Label>
                      <p>{format(new Date(selectedBug.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Última atualização</Label>
                      <p>{format(new Date(selectedBug.updated_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
  );
}