import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Plus,
  Edit,
  Trash2,
  Copy,
  TestTube,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Code,
  Zap,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

const AutomationWorkflows = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [executionsDialogOpen, setExecutionsDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Buscar workflows
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['automation-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select(`
          *,
          management_systems (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar estatísticas
  const { data: statistics } = useQuery({
    queryKey: ['automation-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_statistics')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  // Buscar ações disponíveis
  const { data: actions } = useQuery({
    queryKey: ['automation-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_actions')
        .select('*')
        .eq('available', true)
        .order('category');

      if (error) throw error;
      return data;
    },
  });

  // Buscar execuções de um workflow
  const { data: executions } = useQuery({
    queryKey: ['automation-executions', selectedWorkflow?.id],
    queryFn: async () => {
      if (!selectedWorkflow) return [];

      const { data, error } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('workflow_id', selectedWorkflow.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedWorkflow,
  });

  // Mutation para deletar workflow
  const deleteMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { error } = await supabase
        .from('automation_workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Workflow deletado',
        description: 'O workflow foi removido com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation para testar workflow
  const testMutation = useMutation({
    mutationFn: async ({ workflowId, adminId }: { workflowId: string; adminId: string }) => {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          workflowId,
          administratorId: adminId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Teste concluído',
        description: `${data.recordsExtracted} registros extraídos com sucesso!`,
      });
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      setTestDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (workflow: any) => {
    if (!workflow.tested) {
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Não testado</Badge>;
    }

    if (workflow.success_rate >= 90) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{workflow.success_rate}%</Badge>;
    } else if (workflow.success_rate >= 70) {
      return <Badge variant="secondary"><TrendingUp className="w-3 h-3 mr-1" />{workflow.success_rate}%</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{workflow.success_rate}%</Badge>;
    }
  };

  const WorkflowCard = ({ workflow }: { workflow: any }) => {
    const stats = statistics?.find((s: any) => s.workflow_id === workflow.id);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                {!workflow.active && <Badge variant="outline">Inativo</Badge>}
              </div>
              <CardDescription>{workflow.description}</CardDescription>
            </div>
            {getStatusBadge(workflow)}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Plataforma</p>
                <p className="font-medium capitalize">{workflow.platform_name}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Sistema</p>
                <p className="font-medium">{workflow.management_systems?.name || 'N/A'}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Steps</p>
                <p className="font-medium">{workflow.workflow_steps?.length || 0}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Timeout</p>
                <p className="font-medium">{(workflow.timeout_ms / 1000).toFixed(0)}s</p>
              </div>
            </div>

            {/* Estatísticas */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-3 border-t">
                <div>
                  <p className="text-muted-foreground">Execuções</p>
                  <p className="font-bold text-lg">{stats.total_executions || 0}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Sucesso</p>
                  <p className="font-bold text-lg text-green-600">{stats.successful_executions || 0}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Falhas</p>
                  <p className="font-bold text-lg text-red-600">{stats.failed_executions || 0}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Registros</p>
                  <p className="font-bold text-lg text-blue-600">{stats.total_records_extracted || 0}</p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  setExecutionsDialogOpen(true);
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Execuções
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  setTestDialogOpen(true);
                }}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Testar
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  setEditMode(true);
                  setWorkflowDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  setWorkflowDialogOpen(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteMutation.mutate(workflow.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ExecutionsDialog = () => {
    return (
      <Dialog open={executionsDialogOpen} onOpenChange={setExecutionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Execuções do Workflow</DialogTitle>
            <DialogDescription>
              Histórico de execuções de {selectedWorkflow?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            <div className="space-y-2">
              {executions?.map((exec: any) => (
                <Card key={exec.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {exec.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {exec.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                        {exec.status === 'running' && <Clock className="w-4 h-4 animate-spin text-blue-500" />}

                        <div>
                          <p className="font-medium">
                            {format(new Date(exec.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {exec.completed_at && (
                            <p className="text-sm text-muted-foreground">
                              Duração: {(exec.duration_ms / 1000).toFixed(2)}s
                            </p>
                          )}
                        </div>
                      </div>

                      <Badge variant={
                        exec.status === 'completed' ? 'default' :
                        exec.status === 'failed' ? 'destructive' :
                        'secondary'
                      }>
                        {exec.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Steps</p>
                        <p className="font-medium">{exec.current_step}/{exec.total_steps}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Registros</p>
                        <p className="font-medium text-blue-600">{exec.records_extracted || 0}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Screenshots</p>
                        <p className="font-medium">{exec.screenshots?.length || 0}</p>
                      </div>
                    </div>

                    {exec.error_message && (
                      <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                        <strong>Erro:</strong> {exec.error_message}
                      </div>
                    )}

                    {exec.screenshots?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" />
                          Screenshots
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {exec.screenshots.slice(0, 3).map((screenshot: any, idx: number) => (
                            <div key={idx} className="border rounded p-2 text-xs">
                              <p className="font-mono truncate">{screenshot.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {executions?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma execução encontrada
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  const TestDialog = () => {
    const [selectedAdmin, setSelectedAdmin] = useState('');

    const { data: administrators } = useQuery({
      queryKey: ['administrators-for-test'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('administrators')
          .select('id, name')
          .eq('active', true);

        if (error) throw error;
        return data;
      },
    });

    return (
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testar Workflow</DialogTitle>
            <DialogDescription>
              Execute o workflow para validar seu funcionamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Administradora para Teste</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma administradora" />
                </SelectTrigger>
                <SelectContent>
                  {administrators?.map((admin: any) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Certifique-se que a administradora tem credenciais configuradas
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTestDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => testMutation.mutate({
                  workflowId: selectedWorkflow.id,
                  adminId: selectedAdmin
                })}
                disabled={!selectedAdmin || testMutation.isPending}
              >
                {testMutation.isPending ? 'Testando...' : 'Executar Teste'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const ViewWorkflowDialog = () => {
    return (
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>{selectedWorkflow?.description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            <Tabs defaultValue="steps">
              <TabsList>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
                <TabsTrigger value="config">Configuração</TabsTrigger>
              </TabsList>

              <TabsContent value="steps">
                <div className="space-y-2">
                  {selectedWorkflow?.workflow_steps?.map((step: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{step.action}</Badge>
                              {step.selector && (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {step.selector}
                                </code>
                              )}
                            </div>

                            {step.value && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Valor: {step.value}
                              </p>
                            )}

                            {step.url && (
                              <p className="text-sm text-muted-foreground mt-1">
                                URL: {step.url}
                              </p>
                            )}

                            {step.columns && (
                              <div className="mt-2">
                                <p className="text-sm font-medium mb-1">Colunas:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(step.columns).map(([key, value]: any) => (
                                    <div key={key} className="bg-muted p-2 rounded">
                                      <span className="font-mono">{key}</span> →
                                      <span className="ml-1 text-muted-foreground">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="mapping">
                <Card>
                  <CardContent className="pt-4">
                    <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
                      {JSON.stringify(selectedWorkflow?.data_mapping, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="config">
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Timeout</p>
                          <p className="font-medium">{selectedWorkflow?.timeout_ms}ms</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Max Retries</p>
                          <p className="font-medium">{selectedWorkflow?.max_retries}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Screenshot on Error</p>
                          <p className="font-medium">{selectedWorkflow?.screenshot_on_error ? 'Sim' : 'Não'}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Versão</p>
                          <p className="font-medium">{selectedWorkflow?.version}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Zap}
        title="Workflows de Automação"
        description="Gerencie automações de navegador para extração de dados"
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Workflow
          </Button>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows?.filter(w => w.active).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows?.length
                ? (workflows.reduce((sum, w) => sum + (w.success_rate || 0), 0) / workflows.length).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Execuções</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.reduce((sum: number, s: any) => sum + (s.total_executions || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Workflows */}
      <div className="space-y-4">
        {workflows?.map((workflow: any) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}

        {workflows?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum workflow criado</p>
              <p className="text-sm">
                Clique em "Novo Workflow" para criar sua primeira automação
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedWorkflow && !editMode && <ViewWorkflowDialog />}
      {selectedWorkflow && <ExecutionsDialog />}
      {selectedWorkflow && <TestDialog />}
    </PageContainer>
  );
};

export default AutomationWorkflows;
