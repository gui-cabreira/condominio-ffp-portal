import React, { useState, useEffect } from 'react';
import { Settings, Key, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UazapiInstance {
  id: string;
  name: string;
  instance_id: string;
  api_key: string;
  base_url: string;
  status: string;
  phone_number: string | null;
  is_default: boolean;
  instance_type: string;
  created_at: string;
}

const WorkflowSettings = () => {
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    instance_id: '',
    api_key: '',
    base_url: 'https://api.uazapi.com',
    instance_type: 'general',
    is_default: false
  });

  useEffect(() => {
    fetchInstances();
  }, []);

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
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('uazapi_instances')
        .insert({
          ...formData,
          created_by: userData.user?.id
        });

      if (error) throw error;

      toast.success('Instância criada com sucesso');
      setDialogOpen(false);
      setFormData({
        name: '',
        instance_id: '',
        api_key: '',
        base_url: 'https://api.uazapi.com',
        instance_type: 'general',
        is_default: false
      });
      fetchInstances();
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error(error.message || 'Erro ao criar instância');
    } finally {
      setSaving(false);
    }
  };

  const checkInstanceStatus = async (instance: UazapiInstance) => {
    setCheckingStatus(instance.id);
    try {
      const response = await fetch(`${instance.base_url}/instance/${instance.instance_id}/status`, {
        headers: {
          'Authorization': `Bearer ${instance.api_key}`
        }
      });

      const data = await response.json();
      
      const newStatus = data.connected ? 'connected' : 'disconnected';
      
      await supabase
        .from('uazapi_instances')
        .update({ 
          status: newStatus,
          phone_number: data.phone || null 
        })
        .eq('id', instance.id);

      toast.success(`Status: ${newStatus === 'connected' ? 'Conectado' : 'Desconectado'}`);
      fetchInstances();
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao verificar status da instância');
    } finally {
      setCheckingStatus(null);
    }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;

    try {
      const { error } = await supabase
        .from('uazapi_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Instância excluída');
      fetchInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao excluir instância');
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      // Remove default de todas
      await supabase
        .from('uazapi_instances')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Define a nova como padrão
      await supabase
        .from('uazapi_instances')
        .update({ is_default: true })
        .eq('id', id);

      toast.success('Instância definida como padrão');
      fetchInstances();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Erro ao definir instância padrão');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'connected') {
      return <Badge className="bg-green-500"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
    }
    return <Badge variant="secondary"><WifiOff className="w-3 h-3 mr-1" /> Desconectado</Badge>;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configurações do Workflow
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure as instâncias UAZAPI e integrações
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Instância UAZAPI</DialogTitle>
              <DialogDescription>
                Configure uma nova instância para envio de mensagens
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Instância</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: WhatsApp Principal"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instance_id">Instance ID</Label>
                <Input
                  id="instance_id"
                  value={formData.instance_id}
                  onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
                  placeholder="ID da instância no UAZAPI"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Chave de API"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="base_url">URL Base</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://api.uazapi.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instance_type">Tipo de Instância</Label>
                <Select
                  value={formData.instance_type}
                  onValueChange={(value) => setFormData({ ...formData, instance_type: value })}
                >
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
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Definir como padrão</Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Instância'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma instância configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira instância UAZAPI para começar a enviar mensagens
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Instância
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <Card key={instance.id} className={instance.is_default ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {instance.name}
                      {instance.is_default && (
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {instance.phone_number || instance.instance_id}
                    </CardDescription>
                  </div>
                  {getStatusBadge(instance.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {getTypeBadge(instance.instance_type)}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>URL: {instance.base_url}</p>
                  <p>API Key: ••••••••{instance.api_key.slice(-4)}</p>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkInstanceStatus(instance)}
                    disabled={checkingStatus === instance.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${checkingStatus === instance.id ? 'animate-spin' : ''}`} />
                    Status
                  </Button>
                  
                  {!instance.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAsDefault(instance.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Padrão
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteInstance(instance.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4" />
            Configuração do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Configure o webhook da UAZAPI para receber mensagens:</p>
          <code className="block bg-muted p-2 rounded text-xs break-all">
            {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-webhook`}
          </code>
          <p className="text-xs">Eventos: <code>message.received</code>, <code>message.status</code></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowSettings;
