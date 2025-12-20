import React, { useState, useEffect } from 'react';
import { Settings, Key, Save, Eye, EyeOff, CheckCircle, Server, Smartphone, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppInstance {
  id: string;
  name: string;
  instance_id: string;
  status: string;
  phone_number: string | null;
  instance_type: string;
  created_at: string;
}

const WorkflowSettings = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceType, setNewInstanceType] = useState('general');
  const [creatingInstance, setCreatingInstance] = useState(false);

  useEffect(() => {
    loadSettings();
    fetchInstances();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('negotiation_parameters')
        .select('*')
        .in('parameter_key', ['whatsapp_server_url', 'whatsapp_admin_token']);

      if (error) throw error;

      data?.forEach((param) => {
        if (param.parameter_key === 'whatsapp_server_url') {
          setServerUrl(param.parameter_value);
        } else if (param.parameter_key === 'whatsapp_admin_token') {
          setAdminToken(param.parameter_value);
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('uazapi_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Upsert server URL
      await supabase
        .from('negotiation_parameters')
        .upsert({
          parameter_key: 'whatsapp_server_url',
          parameter_value: serverUrl,
          description: 'URL do servidor WhatsApp'
        }, { onConflict: 'parameter_key' });

      // Upsert admin token
      await supabase
        .from('negotiation_parameters')
        .upsert({
          parameter_key: 'whatsapp_admin_token',
          parameter_value: adminToken,
          description: 'Token de administrador do servidor WhatsApp'
        }, { onConflict: 'parameter_key' });

      toast.success('Configurações salvas com sucesso');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const syncInstances = async () => {
    if (!serverUrl || !adminToken) {
      toast.error('Configure o servidor e token primeiro');
      return;
    }

    setLoadingInstances(true);
    try {
      const response = await fetch(`${serverUrl}/instance/list`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar instâncias');

      const data = await response.json();
      
      // Sync instances to database
      for (const inst of data.instances || data) {
        await supabase
          .from('uazapi_instances')
          .upsert({
            instance_id: inst.instance || inst.id,
            name: inst.name || inst.instance || inst.id,
            api_key: adminToken,
            base_url: serverUrl,
            status: inst.state === 'open' ? 'connected' : 'disconnected',
            phone_number: inst.phone || null
          }, { onConflict: 'instance_id' });
      }

      await fetchInstances();
      toast.success('Instâncias sincronizadas');
    } catch (error: any) {
      console.error('Error syncing instances:', error);
      toast.error('Erro ao sincronizar instâncias');
    } finally {
      setLoadingInstances(false);
    }
  };

  const createInstance = async () => {
    if (!serverUrl || !adminToken || !newInstanceName) {
      toast.error('Preencha todos os campos');
      return;
    }

    setCreatingInstance(true);
    try {
      const instanceId = newInstanceName.toLowerCase().replace(/\s+/g, '_');
      
      const response = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instanceId,
          webhook: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-webhook`,
          webhookByEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
        })
      });

      if (!response.ok) throw new Error('Erro ao criar instância');

      const data = await response.json();

      // Save to database
      const { data: userData } = await supabase.auth.getUser();
      
      await supabase
        .from('uazapi_instances')
        .insert({
          instance_id: instanceId,
          name: newInstanceName,
          api_key: data.hash || adminToken,
          base_url: serverUrl,
          instance_type: newInstanceType,
          status: 'disconnected',
          created_by: userData.user?.id
        });

      toast.success('Instância criada! Escaneie o QR Code para conectar.');
      setDialogOpen(false);
      setNewInstanceName('');
      setNewInstanceType('general');
      await fetchInstances();
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error(error.message || 'Erro ao criar instância');
    } finally {
      setCreatingInstance(false);
    }
  };

  const deleteInstance = async (instance: WhatsAppInstance) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

    try {
      // Delete from server
      if (serverUrl && adminToken) {
        await fetch(`${serverUrl}/instance/delete/${instance.instance_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
      }

      // Delete from database
      await supabase
        .from('uazapi_instances')
        .delete()
        .eq('id', instance.id);

      toast.success('Instância excluída');
      await fetchInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao excluir instância');
    }
  };

  const getQRCode = async (instance: WhatsAppInstance) => {
    try {
      const response = await fetch(`${serverUrl}/instance/qrcode/${instance.instance_id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) throw new Error('Erro ao obter QR Code');

      const data = await response.json();
      
      if (data.qrcode || data.base64) {
        window.open(data.qrcode || data.base64, '_blank');
      } else {
        toast.info('Instância já conectada ou aguardando');
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error('Erro ao obter QR Code');
    }
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      general: { label: 'Geral', variant: 'default' },
      coach: { label: 'Coach IA', variant: 'secondary' },
      notification: { label: 'Notificações', variant: 'outline' }
    };
    const t = types[type] || types.general;
    return <Badge variant={t.variant}>{t.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o servidor de mensagens e gerencie instâncias
        </p>
      </div>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Servidor de Mensagens
          </CardTitle>
          <CardDescription>
            Configure a conexão com o servidor WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serverUrl">URL do Servidor</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://seu-servidor.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminToken">Admin Token</Label>
              <div className="relative">
                <Input
                  id="adminToken"
                  type={showToken ? 'text' : 'password'}
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Token de administrador"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
            
            {serverUrl && adminToken && (
              <Button variant="outline" onClick={syncInstances} disabled={loadingInstances}>
                {loadingInstances ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sincronizar Instâncias
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Instances */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Instâncias WhatsApp</h2>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!serverUrl || !adminToken}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Uma nova instância WhatsApp será criada com webhook configurado automaticamente
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    placeholder="Ex: Coach Vendas"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instanceType">Tipo</Label>
                  <Select value={newInstanceType} onValueChange={setNewInstanceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="coach">Coach IA</SelectItem>
                      <SelectItem value="notification">Notificações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createInstance} disabled={creatingInstance || !newInstanceName}>
                  {creatingInstance ? 'Criando...' : 'Criar Instância'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {instances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma instância</h3>
              <p className="text-muted-foreground text-center mb-4">
                {serverUrl && adminToken 
                  ? 'Crie uma nova instância ou sincronize do servidor'
                  : 'Configure o servidor primeiro para gerenciar instâncias'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{instance.name}</CardTitle>
                      <CardDescription>
                        {instance.phone_number || instance.instance_id}
                      </CardDescription>
                    </div>
                    <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                      {instance.status === 'connected' ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Conectado</>
                      ) : (
                        'Desconectado'
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(instance.instance_type)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {instance.status !== 'connected' && (
                      <Button size="sm" variant="outline" onClick={() => getQRCode(instance)}>
                        QR Code
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => deleteInstance(instance)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4" />
            Webhook Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Todas as instâncias criadas são configuradas automaticamente para receber mensagens.</p>
          <p className="text-xs">Os webhooks são direcionados para o sistema de Coach IA.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowSettings;
