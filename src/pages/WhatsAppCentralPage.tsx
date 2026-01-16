import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CorporateLayout } from '@/components/CorporateLayout';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  MessageSquare, Send, Phone, Search, User, Building2, 
  Clock, CheckCheck, Check, AlertCircle, Bot, Zap, 
  FileText, DollarSign, Calendar, History, Sparkles,
  Filter, RefreshCw, MoreVertical, Pause, Play, Plus,
  Settings, Wifi, WifiOff, QrCode, Trash2, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_from: string | null;
  unread_count: number | null;
  status: string | null;
  awaiting_response_type: string | null;
  tags: string[] | null;
  unit_id: string | null;
  charge_id: string | null;
  condominium_id: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string | null;
  direction: string;
  message_type: string | null;
  media_url: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface ConversationContext {
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    owner_name: string | null;
    owner_phone: string | null;
  } | null;
  condominium: {
    id: string;
    name: string;
  } | null;
  charges: Array<{
    id: string;
    amount: number;
    due_date: string;
    status: string | null;
    pipeline_stage: string | null;
  }>;
  timeline: Array<{
    id: string;
    event_type: string;
    created_at: string;
    event_data: any;
  }>;
}

interface WhatsAppInstance {
  id: string;
  name: string;
  instance_id: string;
  api_key: string;
  base_url: string;
  status: string | null;
  phone_number: string | null;
  is_autonomous: boolean | null;
  is_default: boolean | null;
  instance_type: string | null;
}

export default function WhatsAppCentralPage() {
  const queryClient = useQueryClient();
  const { user, userRoles } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Instance dialog states
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [instanceForm, setInstanceForm] = useState({
    name: '',
    instance_id: '',
    api_key: '',
    is_autonomous: false,
    is_default: false,
    instance_type: 'cobranca',
  });
  
  // Connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState<{
    qrcode?: string;
    paircode?: string;
    status?: string;
  } | null>(null);
  const [phoneForPaircode, setPhoneForPaircode] = useState('');

  const isAdmin = userRoles?.includes('admin');
  const isSupervisor = userRoles?.includes('supervisor');

  // Fetch WhatsApp instances - APENAS as que têm admin_field_01 preenchido
  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uazapi_instances')
        .select('*')
        .not('admin_field_01', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WhatsAppInstance[];
    },
  });

  // Active instance (default or first one)
  const activeInstance = instances?.find(i => i.is_default) || instances?.[0];
  const hasConnectedInstance = instances && instances.length > 0 && instances.some(i => i.status === 'connected');

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['whatsapp-conversations', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['whatsapp-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Fetch conversation context (unit, charges, timeline)
  const { data: context } = useQuery({
    queryKey: ['conversation-context', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return null;

      const result: ConversationContext = {
        unit: null,
        condominium: null,
        charges: [],
        timeline: [],
      };

      // Fetch unit data
      if (selectedConversation.unit_id) {
        const { data: unit } = await supabase
          .from('units')
          .select('id, unit_number, block, owner_name, owner_phone, condominium_id')
          .eq('id', selectedConversation.unit_id)
          .single();
        
        if (unit) {
          result.unit = unit;
          
          // Fetch condominium
          const { data: condo } = await supabase
            .from('condominiums')
            .select('id, name')
            .eq('id', unit.condominium_id)
            .single();
          
          result.condominium = condo;

          // Fetch charges for this unit
          const { data: charges } = await supabase
            .from('charges')
            .select('id, amount, due_date, status, pipeline_stage')
            .eq('unit_id', unit.id)
            .order('due_date', { ascending: false })
            .limit(10);
          
          result.charges = charges || [];
        }
      }

      // Fetch charge timeline if there's a charge_id
      if (selectedConversation.charge_id) {
        const { data: timeline } = await supabase
          .from('charge_timeline')
          .select('id, event_type, created_at, event_data')
          .eq('charge_id', selectedConversation.charge_id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        result.timeline = timeline || [];
      }

      return result;
    },
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error('No conversation selected');

      // Insert message in database
      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: selectedConversation.id,
          content,
          direction: 'outbound',
          message_type: 'text',
        });

      if (insertError) throw insertError;

      // Call edge function to send via UAZAPI
      const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: selectedConversation.phone_number,
          message: content,
        },
      });

      if (sendError) throw sendError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      setMessageInput('');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const filteredConversations = conversations?.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.phone_number.includes(search) ||
      conv.contact_name?.toLowerCase().includes(search)
    );
  });

  const getMessageStatus = (msg: Message) => {
    if (msg.read_at) return { icon: CheckCheck, color: 'text-blue-500', label: 'Lido' };
    if (msg.delivered_at) return { icon: CheckCheck, color: 'text-muted-foreground', label: 'Entregue' };
    return { icon: Check, color: 'text-muted-foreground', label: 'Enviado' };
  };

  const getStatusBadge = (status: string | null) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativo', variant: 'default' },
      waiting: { label: 'Aguardando', variant: 'secondary' },
      resolved: { label: 'Resolvido', variant: 'outline' },
      escalated: { label: 'Escalado', variant: 'destructive' },
    };
    const s = statuses[status || 'active'] || statuses.active;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Instance mutations
  const saveInstanceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: instanceForm.name,
        instance_id: instanceForm.instance_id,
        api_key: instanceForm.api_key,
        base_url: 'https://appnow.uazapi.com', // Servidor fixo, não expor ao usuário
        is_autonomous: instanceForm.is_autonomous,
        is_default: instanceForm.is_default,
        instance_type: instanceForm.instance_type,
        admin_field_01: user?.id, // Marca como visível para este admin
        created_by: user?.id,
        owner_id: user?.id,
      };

      if (editingInstance) {
        const { error } = await supabase
          .from('uazapi_instances')
          .update(payload)
          .eq('id', editingInstance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('uazapi_instances')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingInstance ? 'Instância atualizada!' : 'Instância criada!');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      closeInstanceDialog();
    },
    onError: (error) => {
      console.error('Error saving instance:', error);
      toast.error('Erro ao salvar instância');
    },
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from('uazapi_instances')
        .delete()
        .eq('id', instanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Instância removida');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    },
    onError: (error) => {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao remover instância');
    },
  });

  const openInstanceDialog = (instance?: WhatsAppInstance) => {
    if (instance) {
      setEditingInstance(instance);
      setInstanceForm({
        name: instance.name,
        instance_id: instance.instance_id,
        api_key: instance.api_key,
        is_autonomous: instance.is_autonomous || false,
        is_default: instance.is_default || false,
        instance_type: instance.instance_type || 'cobranca',
      });
    } else {
      setEditingInstance(null);
      setInstanceForm({
        name: '',
        instance_id: '',
        api_key: '',
        is_autonomous: false,
        is_default: false,
        instance_type: 'cobranca',
      });
    }
    setIsInstanceDialogOpen(true);
  };

  const closeInstanceDialog = () => {
    setIsInstanceDialogOpen(false);
    setEditingInstance(null);
    setConnectionData(null);
    setPhoneForPaircode('');
  };

  const handleInstanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    saveInstanceMutation.mutate();
  };

  // Criar instância no servidor UAZAPI (servidor intrínseco)
  const createInstanceOnServer = async () => {
    if (!instanceForm.name) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-connect', {
        body: {
          action: 'create',
          instanceName: instanceForm.name.toLowerCase().replace(/\s+/g, '-'),
          adminFieldValue: user?.id, // Marca como visível para este usuário
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Preencher o form com os dados retornados
      const instance = data.instance || {};
      setInstanceForm(f => ({
        ...f,
        instance_id: instance.id || instance.name || f.name,
        api_key: data.token || instance.token || '',
      }));

      toast.success('Instância criada no servidor! Agora conecte ao WhatsApp.');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error(error.message || 'Erro ao criar instância no servidor');
    } finally {
      setIsConnecting(false);
    }
  };

  // Conectar instância (gerar QR code ou paircode)
  const connectInstance = async (usePaircode = false) => {
    if (!instanceForm.api_key) {
      toast.error('Token da instância é obrigatório');
      return;
    }

    setIsConnecting(true);
    setConnectionData(null);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-connect', {
        body: {
          action: 'connect',
          instanceToken: instanceForm.api_key,
          phone: usePaircode ? phoneForPaircode.replace(/\D/g, '') : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setConnectionData({
        qrcode: data.qrcode,
        paircode: data.paircode,
        status: data.status,
      });

      if (data.connected) {
        toast.success('WhatsApp conectado!');
        if (editingInstance) {
          await supabase
            .from('uazapi_instances')
            .update({ status: 'connected', phone_number: data.instance?.jid?.user })
            .eq('id', editingInstance.id);
        }
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      }
    } catch (error: any) {
      console.error('Error connecting instance:', error);
      toast.error(error.message || 'Erro ao conectar instância');
    } finally {
      setIsConnecting(false);
    }
  };

  // Verificar status da conexão
  const checkConnectionStatus = async () => {
    if (!instanceForm.api_key) return;

    try {
      const { data, error } = await supabase.functions.invoke('uazapi-connect', {
        body: {
          action: 'status',
          instanceToken: instanceForm.api_key,
        },
      });

      if (error) throw error;
      if (!data.success) return;

      setConnectionData({
        qrcode: data.qrcode,
        paircode: data.paircode,
        status: data.status,
      });

      if (data.connected) {
        toast.success('WhatsApp conectado!');
        if (editingInstance) {
          await supabase
            .from('uazapi_instances')
            .update({ 
              status: 'connected', 
              phone_number: data.phone || data.instance?.jid?.user 
            })
            .eq('id', editingInstance.id);
        }
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  // Poll para atualizar status durante conexão
  useEffect(() => {
    if (!isInstanceDialogOpen || !connectionData || connectionData.status === 'connected') return;

    const interval = setInterval(checkConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, [isInstanceDialogOpen, connectionData]);

  const getInstanceStatusBadge = (status: string | null) => {
    if (status === 'connected') {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  };

  return (
    <CorporateLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">WhatsApp IA</h1>
                <p className="text-sm text-muted-foreground">
                  Central de mensagens com IA integrada
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Instance selector */}
              {instances && instances.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {activeInstance?.status === 'connected' ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-muted-foreground" />
                      )}
                      {activeInstance?.name || 'Selecionar Instância'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {instances.map((instance) => (
                      <DropdownMenuItem
                        key={instance.id}
                        className="flex items-center justify-between"
                        onClick={() => openInstanceDialog(instance)}
                      >
                        <div className="flex items-center gap-2">
                          {instance.status === 'connected' ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{instance.name}</span>
                        </div>
                        {instance.is_default && (
                          <Badge variant="outline" className="text-xs">Padrão</Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => openInstanceDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Instância
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => openInstanceDialog()}
                >
                  <Plus className="h-4 w-4" />
                  Conectar WhatsApp
                </Button>
              )}
              
              <Badge variant="outline" className="gap-1">
                <Bot className="h-3 w-3" />
                IA Ativa
              </Badge>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r flex flex-col bg-muted/30">
            {/* Search & Filter */}
            <div className="p-3 space-y-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                {['all', 'active', 'waiting', 'resolved'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className="text-xs"
                  >
                    {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : status === 'waiting' ? 'Aguardando' : 'Resolvidos'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma conversa encontrada
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations?.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-500/10 text-green-600">
                            {conv.contact_name?.[0] || conv.phone_number.slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate">
                              {conv.contact_name || conv.phone_number}
                            </span>
                            {conv.last_message_at && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.last_message_at), { 
                                  addSuffix: false, 
                                  locale: ptBR 
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message_preview || 'Sem mensagens'}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {conv.unread_count && conv.unread_count > 0 && (
                              <Badge variant="default" className="h-5 text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                            {conv.awaiting_response_type && (
                              <Badge variant="outline" className="h-5 text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {conv.awaiting_response_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b flex items-center justify-between bg-background">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-500/10 text-green-600">
                        {selectedConversation.contact_name?.[0] || selectedConversation.phone_number.slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {selectedConversation.contact_name || selectedConversation.phone_number}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.phone_number}
                        {context?.condominium && (
                          <>
                            <span>•</span>
                            <Building2 className="h-3 w-3" />
                            {context.condominium.name}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedConversation.status)}
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages?.map((msg) => {
                        const isOutbound = msg.direction === 'outbound';
                        const status = getMessageStatus(msg);
                        const StatusIcon = status.icon;
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOutbound
                                  ? 'bg-green-600 text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.media_url && (
                                <img
                                  src={msg.media_url}
                                  alt="Mídia"
                                  className="max-w-full rounded mb-2"
                                />
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 ${
                                isOutbound ? 'text-white/70' : 'text-muted-foreground'
                              }`}>
                                <span className="text-xs">
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </span>
                                {isOutbound && (
                                  <StatusIcon className={`h-3 w-3 ${isOutbound ? '' : status.color}`} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t bg-background">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={sendMessageMutation.isPending || !messageInput.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Selecione uma conversa</p>
                  <p className="text-sm">Escolha uma conversa para ver as mensagens</p>
                </div>
              </div>
            )}
          </div>

          {/* Context Panel */}
          {selectedConversation && (
            <div className="w-80 border-l bg-muted/30 flex flex-col">
              <Tabs defaultValue="context" className="flex-1 flex flex-col">
                <TabsList className="m-3 grid grid-cols-3">
                  <TabsTrigger value="context" className="text-xs">Contexto</TabsTrigger>
                  <TabsTrigger value="charges" className="text-xs">Cobranças</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">Histórico</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="context" className="m-0 p-3 space-y-4">
                    {/* Unit Info */}
                    {context?.unit && (
                      <Card>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Morador
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nome:</span>
                            <span className="font-medium">{context.unit.owner_name || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Unidade:</span>
                            <span className="font-medium">
                              {context.unit.unit_number}
                              {context.unit.block && ` - Bloco ${context.unit.block}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Condomínio:</span>
                            <span className="font-medium truncate max-w-32">
                              {context.condominium?.name || '-'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Suggestions */}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-primary">
                          <Sparkles className="h-4 w-4" />
                          Sugestões de IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4 space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                          💬 "Entendo sua situação. Podemos..."
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                          📄 Enviar boleto atualizado
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                          🤝 Propor parcelamento
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Workflow Status */}
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Workflow
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Automação</span>
                          <Badge variant="outline" className="gap-1">
                            <Play className="h-3 w-3" />
                            Ativo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Próxima ação: Lembrete em 2 dias
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="charges" className="m-0 p-3 space-y-2">
                    {context?.charges.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhuma cobrança encontrada
                      </div>
                    ) : (
                      context?.charges.map((charge) => (
                        <Card key={charge.id} className="cursor-pointer hover:bg-muted/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">
                                R$ {charge.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <Badge variant={charge.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                                {charge.status === 'paid' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Venc: {format(new Date(charge.due_date), 'dd/MM/yyyy')}
                            </div>
                            {charge.pipeline_stage && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {charge.pipeline_stage}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="m-0 p-3">
                    {context?.timeline.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum histórico encontrado
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {context?.timeline.map((event) => (
                          <div key={event.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium">{event.event_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Instance Dialog */}
      <Dialog open={isInstanceDialogOpen} onOpenChange={setIsInstanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? 'Configurar Instância WhatsApp' : 'Conectar WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              {editingInstance 
                ? 'Configure e conecte sua instância ao WhatsApp'
                : 'Crie uma nova instância e conecte ao WhatsApp'
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* QR Code / Paircode Display */}
          {connectionData && (connectionData.qrcode || connectionData.paircode) && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="text-center">
                <p className="text-sm font-medium mb-3">
                  {connectionData.paircode 
                    ? 'Digite este código no seu WhatsApp:' 
                    : 'Escaneie o QR Code com seu WhatsApp:'
                  }
                </p>
                
                {connectionData.paircode ? (
                  <div className="text-3xl font-mono font-bold tracking-widest py-4 px-6 bg-background rounded-lg border-2 border-dashed inline-block">
                    {connectionData.paircode}
                  </div>
                ) : connectionData.qrcode ? (
                  <div className="flex justify-center">
                    <img 
                      src={connectionData.qrcode} 
                      alt="QR Code WhatsApp" 
                      className="max-w-[200px] rounded-lg"
                    />
                  </div>
                ) : null}
                
                <p className="text-xs text-muted-foreground mt-3">
                  Abra o WhatsApp {'>'} Configurações {'>'} Aparelhos conectados {'>'} Conectar aparelho
                </p>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={checkConnectionStatus}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verificar conexão
                </Button>
              </div>
            </div>
          )}
          
          <form onSubmit={handleInstanceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da Instância *</Label>
              <div className="flex gap-2">
                <Input
                  id="instance-name"
                  value={instanceForm.name}
                  onChange={(e) => setInstanceForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Cobrança Principal"
                  required
                  className="flex-1"
                />
                {!editingInstance && isAdmin && (
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={createInstanceOnServer}
                    disabled={isConnecting || !instanceForm.name}
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Criar
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'Clique em "Criar" para gerar uma nova instância no servidor' : 'Nome identificador da instância'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instance-id">ID da Instância</Label>
              <Input
                id="instance-id"
                value={instanceForm.instance_id}
                onChange={(e) => setInstanceForm(f => ({ ...f, instance_id: e.target.value }))}
                placeholder="Será preenchido automaticamente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key">Token da Instância *</Label>
              <Input
                id="api-key"
                type="password"
                value={instanceForm.api_key}
                onChange={(e) => setInstanceForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="Token gerado ao criar a instância"
                required
              />
            </div>

            {/* Conexão via QR Code ou Paircode */}
            {instanceForm.api_key && (
              <div className="border rounded-lg p-3 space-y-3">
                <Label className="text-sm font-medium">Conectar ao WhatsApp</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => connectInstance(false)}
                    disabled={isConnecting}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR Code
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => connectInstance(true)}
                    disabled={isConnecting || !phoneForPaircode}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Código
                  </Button>
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Número para código (ex: 5511999999999)"
                    value={phoneForPaircode}
                    onChange={(e) => setPhoneForPaircode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe o número para gerar um código de 8 dígitos
                  </p>
                </div>
              </div>
            )}
            
            
            {/* URL do servidor é intrínseca, não mostrar ao usuário */}
            
            <div className="space-y-2">
              <Label htmlFor="instance-type">Tipo de Instância</Label>
              <select
                id="instance-type"
                value={instanceForm.instance_type}
                onChange={(e) => setInstanceForm(f => ({ ...f, instance_type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="cobranca">Cobrança</option>
                <option value="atendimento">Atendimento</option>
                <option value="coach">Coach IA</option>
                <option value="notificacao">Notificação</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="is-autonomous">Modo Autônomo</Label>
                <span className="text-xs text-muted-foreground">
                  IA responde automaticamente
                </span>
              </div>
              <Switch
                id="is-autonomous"
                checked={instanceForm.is_autonomous}
                onCheckedChange={(checked) => setInstanceForm(f => ({ ...f, is_autonomous: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="is-default">Instância Padrão</Label>
                <span className="text-xs text-muted-foreground">
                  Usar como principal
                </span>
              </div>
              <Switch
                id="is-default"
                checked={instanceForm.is_default}
                onCheckedChange={(checked) => setInstanceForm(f => ({ ...f, is_default: checked }))}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingInstance && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="sm:mr-auto"
                  onClick={() => {
                    if (confirm('Remover esta instância?')) {
                      deleteInstanceMutation.mutate(editingInstance.id);
                      closeInstanceDialog();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              )}
              <Button type="button" variant="outline" onClick={closeInstanceDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveInstanceMutation.isPending}>
                {saveInstanceMutation.isPending ? 'Salvando...' : 'Salvar Instância'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CorporateLayout>
  );
}
