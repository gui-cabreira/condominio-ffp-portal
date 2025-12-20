import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CorporateLayout } from '@/components/CorporateLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Bot, Plus, Edit2, Trash2, MessageSquare, BarChart3, Users, Calendar, TrendingUp, Settings, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CoachAgent {
  id: string;
  name: string;
  description: string | null;
  personality: string;
  focus_areas: string[];
  welcome_message: string;
  active: boolean;
  administrator_id: string | null;
  condominium_id: string | null;
  created_at: string;
}

interface CoachingSession {
  id: string;
  phone_number: string;
  session_type: string;
  session_status: string;
  current_step: number;
  total_steps: number;
  started_at: string;
  last_interaction_at: string;
  unit_id: string | null;
  condominium_id: string | null;
}

export default function CoachAgentsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CoachAgent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: 'Você é um coach profissional, empático e motivador. Você ajuda pessoas a alcançarem seus objetivos através de perguntas poderosas, encorajamento e orientação prática.',
    focus_areas: '',
    welcome_message: 'Olá! Sou seu coach pessoal. Estou aqui para te ajudar a alcançar seus objetivos. Como posso te ajudar hoje?',
    active: true,
    condominium_id: '',
  });

  // Fetch coach agents
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['coach-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CoachAgent[];
    },
  });

  // Fetch coaching sessions
  const { data: sessions } = useQuery({
    queryKey: ['coaching-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .order('last_interaction_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CoachingSession[];
    },
  });

  // Fetch condominiums for select
  const { data: condominiums } = useQuery({
    queryKey: ['condominiums-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Fetch coaching progress stats
  const { data: progressStats } = useQuery({
    queryKey: ['coaching-progress-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_progress')
        .select('metric_type, metric_value')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Aggregate stats
      const stats: Record<string, number> = {};
      data?.forEach(p => {
        stats[p.metric_type] = (stats[p.metric_type] || 0) + 1;
      });

      return stats;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<CoachAgent>) => {
      if (editingAgent) {
        const { error } = await supabase
          .from('coach_agents')
          .update(data)
          .eq('id', editingAgent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coach_agents')
          .insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-agents'] });
      toast.success(editingAgent ? 'Coach atualizado!' : 'Coach criado!');
      closeDialog();
    },
    onError: (error) => {
      console.error('Erro ao salvar coach:', error);
      toast.error('Erro ao salvar coach');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_agents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-agents'] });
      toast.success('Coach removido!');
    },
    onError: (error) => {
      console.error('Erro ao remover coach:', error);
      toast.error('Erro ao remover coach');
    },
  });

  const openEditDialog = (agent: CoachAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      personality: agent.personality,
      focus_areas: (agent.focus_areas || []).join(', '),
      welcome_message: agent.welcome_message,
      active: agent.active,
      condominium_id: agent.condominium_id || '',
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      description: '',
      personality: 'Você é um coach profissional, empático e motivador. Você ajuda pessoas a alcançarem seus objetivos através de perguntas poderosas, encorajamento e orientação prática.',
      focus_areas: '',
      welcome_message: 'Olá! Sou seu coach pessoal. Estou aqui para te ajudar a alcançar seus objetivos. Como posso te ajudar hoje?',
      active: true,
      condominium_id: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const focusAreasArray = formData.focus_areas
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    saveMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      personality: formData.personality,
      focus_areas: focusAreasArray,
      welcome_message: formData.welcome_message,
      active: formData.active,
      condominium_id: formData.condominium_id || null,
    } as any);
  };

  // Stats
  const totalSessions = sessions?.length || 0;
  const activeSessions = sessions?.filter(s => s.session_status === 'active').length || 0;
  const totalAgents = agents?.length || 0;
  const activeAgents = agents?.filter(a => a.active).length || 0;

  return (
    <CorporateLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coach de IA</h1>
            <p className="text-muted-foreground">
              Configure coaches personalizados para WhatsApp
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => closeDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Coach
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAgent ? 'Editar Coach' : 'Novo Coach'}</DialogTitle>
                <DialogDescription>
                  Configure a personalidade e comportamento do coach de IA
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Coach</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Coach Financeiro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condominium">Condomínio (opcional)</Label>
                    <Select
                      value={formData.condominium_id}
                      onValueChange={(value) => setFormData({ ...formData, condominium_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os condomínios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os condomínios</SelectItem>
                        {condominiums?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descrição do coach"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personality">Personalidade (System Prompt)</Label>
                  <Textarea
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    placeholder="Descreva a personalidade e comportamento do coach..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Define como o coach se comporta e responde às mensagens
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focus_areas">Áreas de Foco</Label>
                  <Input
                    id="focus_areas"
                    value={formData.focus_areas}
                    onChange={(e) => setFormData({ ...formData, focus_areas: e.target.value })}
                    placeholder="financeiro, produtividade, bem-estar (separado por vírgula)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                    placeholder="Mensagem inicial quando alguém inicia uma conversa"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coaches Ativos</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAgents}</div>
              <p className="text-xs text-muted-foreground">de {totalAgents} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions}</div>
              <p className="text-xs text-muted-foreground">conversas em andamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground">usuários atendidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metas Registradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats?.goal_set || 0}</div>
              <p className="text-xs text-muted-foreground">progressos: {progressStats?.goal_progress || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="agents">
          <TabsList>
            <TabsTrigger value="agents">
              <Bot className="mr-2 h-4 w-4" />
              Coaches
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <MessageSquare className="mr-2 h-4 w-4" />
              Sessões
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="mr-2 h-4 w-4" />
              Configuração
            </TabsTrigger>
          </TabsList>

          {/* Coaches Tab */}
          <TabsContent value="agents" className="space-y-4">
            {loadingAgents ? (
              <div className="text-center py-8">Carregando...</div>
            ) : agents?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum coach configurado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro coach de IA para WhatsApp
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Coach
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents?.map((agent) => (
                  <Card key={agent.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5" />
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                        </div>
                        <Badge variant={agent.active ? 'default' : 'secondary'}>
                          {agent.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <CardDescription>{agent.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {agent.focus_areas?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {agent.focus_areas.map((area, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-muted-foreground line-clamp-2">
                          {agent.personality}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(agent)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Remover este coach?')) {
                              deleteMutation.mutate(agent.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Sessões de Coaching</CardTitle>
                <CardDescription>Histórico de conversas e sessões ativas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Última Interação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.phone_number.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={session.session_status === 'active' ? 'default' : 'secondary'}
                          >
                            {session.session_status === 'active' ? 'Ativa' : 'Finalizada'}
                          </Badge>
                        </TableCell>
                        <TableCell>{session.session_type}</TableCell>
                        <TableCell>
                          {format(new Date(session.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.last_interaction_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma sessão encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Webhook</CardTitle>
                <CardDescription>Configure o UAZAPI para receber mensagens do coach</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://szryusxuheimljfhsuku.supabase.co/functions/v1/coach-webhook"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('https://szryusxuheimljfhsuku.supabase.co/functions/v1/coach-webhook');
                        toast.success('URL copiada!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure esta URL no painel da UAZAPI como webhook de mensagens
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Eventos para ativar no UAZAPI</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">message.received</Badge>
                    <Badge variant="outline">message.status</Badge>
                    <Badge variant="outline">connection.update</Badge>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Fluxo de Funcionamento
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Condômino envia mensagem via WhatsApp</li>
                    <li>UAZAPI recebe e encaminha para o webhook</li>
                    <li>Sistema identifica condômino pelo telefone</li>
                    <li>Coach de IA analisa contexto e intenção</li>
                    <li>Resposta personalizada é enviada automaticamente</li>
                    <li>Progresso e métricas são registrados</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CorporateLayout>
  );
}
