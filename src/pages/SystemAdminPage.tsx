import { useEffect, useState } from 'react';
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
import { Bug, Activity, Users, AlertTriangle, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [loading, setLoading] = useState(true);

  // Form states
  const [newBugTitle, setNewBugTitle] = useState('');
  const [newBugDescription, setNewBugDescription] = useState('');
  const [newBugSeverity, setNewBugSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [selectedBug, setSelectedBug] = useState<SystemBug | null>(null);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadBugs(),
      loadLoginLogs(),
      loadSystemLogs(),
      loadLoginStats()
    ]);
    setLoading(false);
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
      .order('last_login', { ascending: false });

    if (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } else {
      setLoginStats((data || []) as LoginStats[]);
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

          <Tabs defaultValue="bugs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="bugs">Bugs</TabsTrigger>
              <TabsTrigger value="login-stats">Estatísticas de Login</TabsTrigger>
              <TabsTrigger value="login-logs">Logs de Login</TabsTrigger>
              <TabsTrigger value="system-logs">Logs do Sistema</TabsTrigger>
            </TabsList>

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

            <TabsContent value="login-stats">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Login dos Usuários</CardTitle>
                  <CardDescription>Último login e tentativas de acesso</CardDescription>
                </CardHeader>
                <CardContent>
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