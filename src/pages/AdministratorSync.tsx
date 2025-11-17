import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  Play,
  Calendar,
  AlertCircle,
  TrendingUp,
  Database
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdministratorSync = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [syncingAdmins, setSyncingAdmins] = useState<Set<string>>(new Set());

  // Buscar administradoras com status de sincronização
  const { data: administrators, isLoading } = useQuery({
    queryKey: ['administrators-sync-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select(`
          *,
          management_systems (
            id,
            name
          )
        `)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Buscar configurações de sincronização
  const { data: syncConfigs } = useQuery({
    queryKey: ['administrator-sync-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrator_sync_config')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  // Buscar logs de sincronização
  const { data: syncLogs } = useQuery({
    queryKey: ['administrator-sync-logs', selectedAdmin?.id],
    queryFn: async () => {
      if (!selectedAdmin) return [];

      const { data, error } = await supabase
        .from('administrator_sync_logs')
        .select('*')
        .eq('administrator_id', selectedAdmin.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedAdmin,
  });

  // Mutation para sincronização manual
  const syncMutation = useMutation({
    mutationFn: async (administratorId: string) => {
      setSyncingAdmins(prev => new Set(prev).add(administratorId));

      const { data, error } = await supabase.functions.invoke('sync-administrator-data', {
        body: {
          administratorId,
          syncType: 'manual',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, administratorId) => {
      toast({
        title: 'Sincronização concluída',
        description: `${data.stats?.newCharges || 0} novas cobranças importadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['administrators-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['administrator-sync-logs'] });
      setSyncingAdmins(prev => {
        const newSet = new Set(prev);
        newSet.delete(administratorId);
        return newSet;
      });
    },
    onError: (error: any, administratorId) => {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive',
      });
      setSyncingAdmins(prev => {
        const newSet = new Set(prev);
        newSet.delete(administratorId);
        return newSet;
      });
    },
  });

  // Mutation para salvar configuração
  const saveConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const { data, error } = await supabase
        .from('administrator_sync_config')
        .upsert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Configuração salva',
        description: 'As configurações de sincronização foram atualizadas.',
      });
      queryClient.invalidateQueries({ queryKey: ['administrator-sync-configs'] });
      setConfigDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getAdminConfig = (adminId: string) => {
    return syncConfigs?.find(c => c.administrator_id === adminId);
  };

  const handleSync = (adminId: string) => {
    syncMutation.mutate(adminId);
  };

  const getStatusBadge = (admin: any) => {
    if (syncingAdmins.has(admin.id)) {
      return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Sincronizando</Badge>;
    }

    if (!admin.last_sync_status) {
      return <Badge variant="outline">Nunca sincronizado</Badge>;
    }

    switch (admin.last_sync_status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falha</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const ConfigDialog = () => {
    const [config, setConfig] = useState<any>(
      getAdminConfig(selectedAdmin?.id) || {
        administrator_id: selectedAdmin?.id,
        auto_sync_enabled: false,
        sync_frequency: 'daily',
        sync_time: '03:00:00',
        auth_type: 'credentials',
        notify_on_error: true,
        notify_on_success: false,
      }
    );

    return (
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Sincronização</DialogTitle>
            <DialogDescription>
              Configure a sincronização automática para {selectedAdmin?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sincronização Automática */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sincronização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar sincronização agendada
                </p>
              </div>
              <Switch
                checked={config.auto_sync_enabled}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, auto_sync_enabled: checked })
                }
              />
            </div>

            {config.auto_sync_enabled && (
              <>
                {/* Frequência */}
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={config.sync_frequency}
                    onValueChange={(value) =>
                      setConfig({ ...config, sync_frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">A cada hora</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Horário */}
                {config.sync_frequency !== 'hourly' && (
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={config.sync_time}
                      onChange={(e) =>
                        setConfig({ ...config, sync_time: e.target.value + ':00' })
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Horário de execução da sincronização
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Tipo de Autenticação */}
            <div className="space-y-2">
              <Label>Tipo de Autenticação</Label>
              <Select
                value={config.auth_type}
                onValueChange={(value) =>
                  setConfig({ ...config, auth_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credentials">Usuário e Senha</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="scraping">Web Scraping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notificações */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Notificações</h4>

              <div className="flex items-center justify-between">
                <Label>Notificar em caso de erro</Label>
                <Switch
                  checked={config.notify_on_error}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, notify_on_error: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Notificar em caso de sucesso</Label>
                <Switch
                  checked={config.notify_on_success}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, notify_on_success: checked })
                  }
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setConfigDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => saveConfigMutation.mutate(config)}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const LogsDialog = () => {
    return (
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Sincronizações</DialogTitle>
            <DialogDescription>
              Últimas 20 sincronizações de {selectedAdmin?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {syncLogs?.map((log: any) => (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {log.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      {log.status === 'partial' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                      {log.status === 'running' && <RefreshCw className="w-4 h-4 animate-spin" />}

                      <div>
                        <p className="font-medium capitalize">{log.sync_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <Badge variant={
                      log.status === 'completed' ? 'default' :
                      log.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {log.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Novos Registros</p>
                      <p className="font-medium">
                        {(log.new_condominiums || 0) + (log.new_units || 0) + (log.new_charges || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Atualizações</p>
                      <p className="font-medium">
                        {(log.updated_condominiums || 0) + (log.updated_units || 0) + (log.updated_charges || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Erros</p>
                      <p className="font-medium text-red-500">{log.errors_count || 0}</p>
                    </div>
                  </div>

                  {log.errors_count > 0 && log.errors && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-xs">
                      <p className="font-medium text-red-900 mb-1">Erros encontrados:</p>
                      <pre className="text-red-700 overflow-x-auto">
                        {JSON.stringify(log.errors, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {syncLogs?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sincronização encontrada
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sincronização de Administradoras</h1>
          <p className="text-muted-foreground mt-1">
            Configure e monitore a sincronização automática de dados
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Administradoras</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{administrators?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronização Automática</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncConfigs?.filter(c => c.auto_sync_enabled).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sinc. com Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {administrators?.filter(a => a.last_sync_status === 'success').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronizações com Falha</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {administrators?.filter(a => a.last_sync_status === 'failed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Administradoras */}
      <Card>
        <CardHeader>
          <CardTitle>Administradoras</CardTitle>
          <CardDescription>
            Gerencie a sincronização de dados de cada administradora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {administrators?.map((admin: any) => {
              const config = getAdminConfig(admin.id);
              const isSyncing = syncingAdmins.has(admin.id);

              return (
                <Card key={admin.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{admin.name}</h3>
                          {getStatusBadge(admin)}
                          {config?.auto_sync_enabled && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Sistema</p>
                            <p className="font-medium">{admin.management_systems?.name || 'N/A'}</p>
                          </div>

                          <div>
                            <p className="text-muted-foreground">Última Sincronização</p>
                            <p className="font-medium">
                              {admin.last_sync_at
                                ? format(new Date(admin.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                : 'Nunca'}
                            </p>
                          </div>

                          {config?.auto_sync_enabled && (
                            <div>
                              <p className="text-muted-foreground">Próxima Sincronização</p>
                              <p className="font-medium">
                                {config.next_sync_at
                                  ? format(new Date(config.next_sync_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                  : 'N/A'}
                              </p>
                            </div>
                          )}

                          {admin.portal_url && (
                            <div>
                              <p className="text-muted-foreground">Portal Configurado</p>
                              <p className="font-medium text-green-600">Sim</p>
                            </div>
                          )}
                        </div>

                        {admin.sync_error_message && (
                          <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                            <strong>Erro:</strong> {admin.sync_error_message}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setLogsDialogOpen(true);
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Logs
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setConfigDialogOpen(true);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleSync(admin.id)}
                          disabled={isSyncing || !admin.portal_url}
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Sincronizar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {administrators?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma administradora cadastrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedAdmin && <ConfigDialog />}
      {selectedAdmin && <LogsDialog />}
    </div>
  );
};

export default AdministratorSync;
