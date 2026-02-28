import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CorporateLayout } from '@/components/CorporateLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  MessageSquare, Send, Phone, Search, User, Building2, 
  Clock, CheckCheck, Check, AlertCircle, Bot, Zap, 
  FileText, DollarSign, Calendar, History, Sparkles,
  Filter, RefreshCw, MoreVertical, Pause, Play, Plus,
  Settings, Wifi, WifiOff, QrCode, Trash2, ExternalLink, Brain, BookOpen,
  Download, Image as ImageIcon
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { ConnectionWizard } from '@/components/whatsapp/ConnectionWizard';
import { KnowledgeBase } from '@/components/whatsapp/KnowledgeBase';
import { MessageTemplates } from '@/components/whatsapp/MessageTemplates';
import { ConversationActions, MessageActions } from '@/components/whatsapp/ConversationActions';

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
  avatar_url: string | null;
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
  remote_jid?: string | null;
  caption?: string | null;
  status?: string | null;
}

interface ConversationContext {
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    tenant_name: string | null;
    tenant_phone: string | null;
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
  admin_field_01: string | null;
}

export default function WhatsAppCentralPage() {
  const queryClient = useQueryClient();
  const { user, userRoles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAdmin = userRoles?.includes('admin');

  // Full sync from UAZAPI (chats + messages + avatars)
  const handleSyncConversations = async () => {
    if (!activeInstance || isSyncing) return;
    setIsSyncing(true);
    try {
      toast.info('Sincronizando conversas do WhatsApp...');
      
      // Use sync_all for comprehensive sync
      const { data: result, error } = await supabase.functions.invoke('uazapi-sse', {
        body: { action: 'sync_all', instanceToken: activeInstance.api_key, limit: 200 },
      });

      if (error) throw error;

      const chatsSynced = result?.chats?.synced || 0;
      const chatsUpdated = result?.chats?.updated || 0;
      const msgsImported = result?.messagesImported || 0;
      const avatarsUpdated = result?.avatarsUpdated || 0;
      const contactsLinked = result?.linked?.linked || 0;

      toast.success(
        `Sync completo! ${chatsSynced} novas, ${chatsUpdated} atualizadas, ${msgsImported} msgs, ${avatarsUpdated} avatares, ${contactsLinked} vinculados`
      );

      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Erro ao sincronizar conversas');
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch avatar for a specific conversation
  const handleFetchAvatar = async (conv: Conversation) => {
    if (!activeInstance) return;
    try {
      const { data } = await supabase.functions.invoke('uazapi-sse', {
        body: { action: 'fetch_profile_picture', instanceToken: activeInstance.api_key, phone: conv.phone_number },
      });
      if (data?.avatarUrl) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        toast.success('Avatar atualizado!');
      } else {
        toast.info('Avatar não disponível para este contato');
      }
    } catch {
      toast.error('Erro ao buscar avatar');
    }
  };

  // Sync messages for current conversation
  const handleSyncMessages = async () => {
    if (!activeInstance || !selectedConversation) return;
    try {
      toast.info('Importando mensagens...');
      const { data, error } = await supabase.functions.invoke('uazapi-sse', {
        body: { 
          action: 'sync_messages', 
          instanceToken: activeInstance.api_key, 
          phone: selectedConversation.phone_number,
          limit: 100 
        },
      });
      if (error) throw error;
      const imported = data?.imported || 0;
      toast.success(`${imported} mensagens importadas`);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConversation.id] });
    } catch {
      toast.error('Erro ao importar mensagens');
    }
  };

  // Fetch WhatsApp instances
  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uazapi_instances')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WhatsAppInstance[];
    },
  });

  // Active instance
  const activeInstance = selectedInstance || instances?.find(i => i.is_default) || instances?.[0];
  const hasConnectedInstance = instances && instances.length > 0 && instances.some(i => i.status === 'connected');

  // Sync instance status from UAZAPI on load
  useEffect(() => {
    if (!instances || instances.length === 0) return;
    
    const syncInstanceStatus = async (instance: WhatsAppInstance) => {
      try {
        const { data } = await supabase.functions.invoke('uazapi-connect', {
          body: { action: 'status', instanceToken: instance.api_key },
        });
        
        if (data?.success) {
          const newStatus = data.connected && data.loggedIn ? 'connected' : 'disconnected';
          const newPhone = data.phone || null;
          const newName = data.profileName || instance.name;
          
          if (newStatus !== instance.status || newPhone !== instance.phone_number || newName !== instance.name) {
            await supabase
              .from('uazapi_instances')
              .update({ 
                status: newStatus, 
                phone_number: newPhone,
                name: newName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', instance.id);
            
            queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
          }
        }
      } catch (err) {
        console.error('Error syncing instance status:', err);
      }
    };

    instances.forEach(syncInstanceStatus);
  }, [instances?.length]);

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
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  // Fetch conversation context (unit, charges, timeline) - search by unit_id OR phone number
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

      let unitData: any = null;

      if (selectedConversation.unit_id) {
        const { data: unit } = await supabase
          .from('units')
          .select('id, unit_number, block, owner_name, owner_phone, tenant_name, tenant_phone, condominium_id')
          .eq('id', selectedConversation.unit_id)
          .single();
        unitData = unit;
      }

      // If no unit_id, try to find by phone number
      if (!unitData) {
        const phoneClean = selectedConversation.phone_number.replace(/\D/g, '');
        // Try different phone formats
        const phoneSuffixes = [phoneClean, phoneClean.replace(/^55/, ''), `55${phoneClean}`];
        
        for (const phone of phoneSuffixes) {
          if (phone.length < 8) continue;
          const suffix = phone.slice(-9);
          
          const { data: units } = await supabase
            .from('units')
            .select('id, unit_number, block, owner_name, owner_phone, tenant_name, tenant_phone, condominium_id')
            .or(`owner_phone.ilike.%${suffix},tenant_phone.ilike.%${suffix}`);
          
          if (units && units.length > 0) {
            unitData = units[0];
            // Auto-link the conversation
            await supabase
              .from('whatsapp_conversations')
              .update({ unit_id: unitData.id, condominium_id: unitData.condominium_id })
              .eq('id', selectedConversation.id);
            break;
          }
        }
      }
      
      if (unitData) {
        result.unit = unitData;
        
        const { data: condo } = await supabase
          .from('condominiums')
          .select('id, name')
          .eq('id', unitData.condominium_id)
          .single();
        
        result.condominium = condo;

        const { data: charges } = await supabase
          .from('charges')
          .select('id, amount, due_date, status, pipeline_stage')
          .eq('unit_id', unitData.id)
          .order('due_date', { ascending: false })
          .limit(10);
        
        result.charges = charges || [];
      }

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
      if (!selectedConversation || !activeInstance) throw new Error('No conversation or instance selected');

      const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: selectedConversation.phone_number,
          message: content,
          conversationId: selectedConversation.id,
          instanceId: activeInstance.instance_id,
          instanceToken: activeInstance.api_key,
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

  // Auto-select conversation from query param
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam && conversations && conversations.length > 0 && !selectedConversation) {
      const cleanPhone = phoneParam.replace(/\D/g, '');
      const found = conversations.find(c => c.phone_number.replace(/\D/g, '').includes(cleanPhone));
      if (found) {
        setSelectedConversation(found);
        setActiveTab('chat');
        searchParams.delete('phone');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [conversations, searchParams]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count && selectedConversation.unread_count > 0) {
      supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', selectedConversation.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        });
    }
  }, [selectedConversation?.id]);

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
    if (msg.status === 'read') return { icon: CheckCheck, color: 'text-blue-500', label: 'Lido' };
    if (msg.status === 'delivered') return { icon: CheckCheck, color: 'text-muted-foreground', label: 'Entregue' };
    if (msg.status === 'failed') return { icon: AlertCircle, color: 'text-destructive', label: 'Falhou' };
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

  const handleConversationAction = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    setSelectedConversation(null);
  };

  const formatPhoneDisplay = (phone: string) => {
    const p = phone.replace(/\D/g, '');
    if (p.length === 13) return p.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
    if (p.length === 12) return p.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '+$1 ($2) $3-$4');
    if (p.length === 11) return p.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return phone;
  };

  const renderMediaContent = (msg: Message) => {
    if (!msg.media_url) return null;
    
    switch (msg.message_type) {
      case 'image':
        return (
          <img
            src={msg.media_url}
            alt="Imagem"
            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(msg.media_url!, '_blank')}
            loading="lazy"
          />
        );
      case 'video':
        return (
          <video
            src={msg.media_url}
            controls
            className="max-w-full rounded-lg mb-2"
            preload="metadata"
          />
        );
      case 'audio':
        return (
          <audio
            src={msg.media_url}
            controls
            className="w-full mb-2"
            preload="metadata"
          />
        );
      case 'document':
        return (
          <a
            href={msg.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded bg-background/50 mb-2 hover:bg-background/80 transition-colors"
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm underline">{msg.caption || 'Documento'}</span>
            <Download className="h-4 w-4 ml-auto" />
          </a>
        );
      case 'sticker':
        return (
          <img
            src={msg.media_url}
            alt="Figurinha"
            className="max-w-[150px] mb-2"
            loading="lazy"
          />
        );
      default:
        return null;
    }
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
              {/* Main tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mr-4">
                <TabsList className="grid grid-cols-4 w-auto">
                  <TabsTrigger value="chat" className="gap-1 text-xs px-3">
                    <MessageSquare className="h-3 w-3" />
                    Conversas
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="gap-1 text-xs px-3">
                    <FileText className="h-3 w-3" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="gap-1 text-xs px-3">
                    <Brain className="h-3 w-3" />
                    Base IA
                  </TabsTrigger>
                  <TabsTrigger value="instances" className="gap-1 text-xs px-3">
                    <Settings className="h-3 w-3" />
                    Instâncias
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
                      <span className="max-w-[150px] truncate">{activeInstance?.name || 'Selecionar'}</span>
                      {activeInstance?.phone_number && (
                        <span className="text-muted-foreground text-xs">
                          ({formatPhoneDisplay(activeInstance.phone_number)})
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    {instances.map((instance) => (
                      <DropdownMenuItem
                        key={instance.id}
                        className="flex items-center justify-between"
                        onClick={() => setSelectedInstance(instance)}
                      >
                        <div className="flex items-center gap-2">
                          {instance.status === 'connected' ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-muted-foreground" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm">{instance.name}</span>
                            {instance.phone_number && (
                              <span className="text-xs text-muted-foreground">{formatPhoneDisplay(instance.phone_number)}</span>
                            )}
                          </div>
                        </div>
                        {instance.is_default && (
                          <Badge variant="outline" className="text-xs">Padrão</Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => setIsWizardOpen(true)}>
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
                  onClick={() => setIsWizardOpen(true)}
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
              {activeInstance?.status === 'connected' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncConversations}
                  disabled={isSyncing}
                  title="Sincronizar tudo do WhatsApp (conversas, mensagens, avatares)"
                  className="gap-1"
                >
                  <Download className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sincronizando...' : 'Sync Completo'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content based on active tab */}
        {activeTab === 'chat' && (
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
                  <div className="text-center py-8 space-y-3">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      Nenhuma conversa encontrada
                    </p>
                    {activeInstance?.status === 'connected' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSyncConversations}
                        disabled={isSyncing}
                        className="gap-2"
                      >
                        <Download className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Sincronizando...' : 'Importar do WhatsApp'}
                      </Button>
                    )}
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
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={conv.avatar_url || undefined} 
                                alt={conv.contact_name || conv.phone_number}
                              />
                              <AvatarFallback className="bg-green-500/10 text-green-600 text-sm">
                                {conv.contact_name?.[0]?.toUpperCase() || conv.phone_number.slice(-2)}
                              </AvatarFallback>
                            </Avatar>
                            {conv.unread_count && conv.unread_count > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {conv.unread_count > 99 ? '99+' : conv.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-medium text-sm truncate">
                                {conv.contact_name || formatPhoneDisplay(conv.phone_number)}
                              </span>
                              {conv.last_message_at && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatDistanceToNow(new Date(conv.last_message_at), { 
                                    addSuffix: false, 
                                    locale: ptBR 
                                  })}
                                </span>
                              )}
                            </div>
                            {conv.contact_name && (
                              <p className="text-xs text-muted-foreground mb-0.5">
                                {formatPhoneDisplay(conv.phone_number)}
                              </p>
                            )}
                            <div className="flex items-center gap-1">
                              {conv.last_message_from === 'system' || conv.last_message_from === 'bot' ? (
                                <CheckCheck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              ) : null}
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.last_message_preview || 'Sem mensagens'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {conv.awaiting_response_type && (
                                <Badge variant="outline" className="h-4 text-[10px] px-1 gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {conv.awaiting_response_type}
                                </Badge>
                              )}
                              {conv.status === 'escalated' && (
                                <Badge variant="destructive" className="h-4 text-[10px] px-1">
                                  Escalado
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
                        <AvatarImage 
                          src={selectedConversation.avatar_url || undefined}
                          alt={selectedConversation.contact_name || selectedConversation.phone_number}
                        />
                        <AvatarFallback className="bg-green-500/10 text-green-600">
                          {selectedConversation.contact_name?.[0]?.toUpperCase() || selectedConversation.phone_number.slice(-2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {selectedConversation.contact_name || formatPhoneDisplay(selectedConversation.phone_number)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {formatPhoneDisplay(selectedConversation.phone_number)}
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
                      {/* Sync messages button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleSyncMessages}
                        title="Importar histórico de mensagens"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {/* Fetch avatar button */}
                      {!selectedConversation.avatar_url && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleFetchAvatar(selectedConversation)}
                          title="Buscar foto do contato"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {activeInstance && (
                        <ConversationActions
                          conversationId={selectedConversation.id}
                          instanceId={activeInstance.id}
                          onAction={handleConversationAction}
                        />
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                        <MessageSquare className="h-10 w-10 opacity-30" />
                        <p>Nenhuma mensagem ainda</p>
                        {activeInstance?.status === 'connected' && (
                          <Button variant="outline" size="sm" onClick={handleSyncMessages} className="gap-2">
                            <Download className="h-4 w-4" />
                            Importar Histórico
                          </Button>
                        )}
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
                              className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}
                            >
                              <div className="flex items-start gap-1">
                                {!isOutbound && activeInstance && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MessageActions
                                      messageId={msg.id}
                                      conversationId={selectedConversation.id}
                                      instanceId={activeInstance.id}
                                      instanceApiKey={activeInstance.api_key}
                                      remoteJid={msg.remote_jid || selectedConversation.phone_number}
                                    />
                                  </div>
                                )}
                                <div
                                  className={`max-w-[70%] rounded-lg p-3 ${
                                    isOutbound
                                      ? 'bg-green-600 text-white'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {/* Media content */}
                                  {renderMediaContent(msg)}
                                  
                                  {/* Text content */}
                                  {msg.content && msg.content !== '[Imagem]' && msg.content !== '[Áudio]' && msg.content !== '[Vídeo]' && msg.content !== '[Figurinha]' && msg.content !== '[Documento]' && msg.content !== '[Localização]' && msg.content !== '[Contato]' && (
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                  )}
                                  
                                  {/* Caption for media */}
                                  {msg.caption && msg.caption !== msg.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words mt-1">{msg.caption}</p>
                                  )}
                                  
                                  {/* Timestamp + status */}
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
                                {isOutbound && activeInstance && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MessageActions
                                      messageId={msg.id}
                                      conversationId={selectedConversation.id}
                                      instanceId={activeInstance.id}
                                      instanceApiKey={activeInstance.api_key}
                                      remoteJid={msg.remote_jid || selectedConversation.phone_number}
                                    />
                                  </div>
                                )}
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
                      {/* Contact Card */}
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                          <Avatar className="h-20 w-20">
                            <AvatarImage
                              src={selectedConversation.avatar_url || undefined}
                              alt={selectedConversation.contact_name || ''}
                            />
                            <AvatarFallback className="bg-green-500/10 text-green-600 text-2xl">
                              {selectedConversation.contact_name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">
                              {selectedConversation.contact_name || 'Contato Desconhecido'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatPhoneDisplay(selectedConversation.phone_number)}
                            </p>
                          </div>
                          {!selectedConversation.avatar_url && activeInstance && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFetchAvatar(selectedConversation)}
                              className="gap-1 text-xs"
                            >
                              <ImageIcon className="h-3 w-3" />
                              Buscar Foto
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Unit Info */}
                      {context?.unit && (
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Unidade
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0 px-4 pb-3 space-y-1 text-sm">
                            <p>
                              <span className="text-muted-foreground">Unidade:</span>{' '}
                              {context.unit.unit_number}
                              {context.unit.block && ` - Bloco ${context.unit.block}`}
                            </p>
                            {context.unit.owner_name && (
                              <p>
                                <span className="text-muted-foreground">Proprietário:</span>{' '}
                                {context.unit.owner_name}
                              </p>
                            )}
                            {context.unit.tenant_name && (
                              <p>
                                <span className="text-muted-foreground">Inquilino:</span>{' '}
                                {context.unit.tenant_name}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Condominium */}
                      {context?.condominium && (
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Condomínio
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0 px-4 pb-3 text-sm">
                            {context.condominium.name}
                          </CardContent>
                        </Card>
                      )}

                      {/* No context */}
                      {!context?.unit && !context?.condominium && (
                        <div className="text-center py-4 text-muted-foreground text-sm space-y-3">
                          <AlertCircle className="h-6 w-6 mx-auto opacity-50" />
                          <p>Contato não vinculado a nenhuma unidade</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={async () => {
                              try {
                                toast.info('Buscando vínculos...');
                                const { data, error } = await supabase.functions.invoke('uazapi-sse', {
                                  body: { action: 'link_contacts', instanceToken: '' },
                                });
                                if (error) throw error;
                                toast.success(`${data?.linked || 0} contatos vinculados de ${data?.total || 0}`);
                                queryClient.invalidateQueries({ queryKey: ['conversation-context'] });
                                queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
                              } catch {
                                toast.error('Erro ao vincular contatos');
                              }
                            }}
                          >
                            <Zap className="h-3 w-3" />
                            Vincular Contatos
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="charges" className="m-0 p-3 space-y-3">
                      {context?.charges.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhuma cobrança encontrada
                        </div>
                      ) : (
                        <>
                          {/* Total */}
                          <Card className="border-destructive/30 bg-destructive/5">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Débito Total</span>
                                <span className="font-bold text-destructive">
                                  R$ {context?.charges.reduce((sum, c) => sum + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {context?.charges.filter(c => c.status !== 'paid').length} cobrança(s) pendente(s)
                              </div>
                            </CardContent>
                          </Card>

                          {/* Quick actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={async () => {
                                const pendingCharge = context?.charges.find(c => c.status !== 'paid');
                                if (!pendingCharge) return;
                                try {
                                  await supabase.functions.invoke('send-charge-notification', {
                                    body: { chargeId: pendingCharge.id, channel: 'whatsapp' }
                                  });
                                  toast.success('Cobrança enviada via WhatsApp');
                                } catch { toast.error('Erro ao enviar'); }
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={async () => {
                                const pendingCharge = context?.charges.find(c => c.status !== 'paid');
                                if (!pendingCharge) return;
                                try {
                                  await supabase.functions.invoke('send-charge-notification', {
                                    body: { chargeId: pendingCharge.id, channel: 'email' }
                                  });
                                  toast.success('Cobrança enviada via Email');
                                } catch { toast.error('Erro ao enviar'); }
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                          </div>

                          <Button
                            size="sm"
                            variant="default"
                            className="w-full text-xs gap-1"
                            onClick={async () => {
                              const pendingCharge = context?.charges.find(c => c.status !== 'paid');
                              if (!pendingCharge) return;
                              try {
                                await supabase.functions.invoke('calculate-fees', {
                                  body: { chargeId: pendingCharge.id }
                                });
                                queryClient.invalidateQueries({ queryKey: ['conversation-context'] });
                                toast.success('Valores atualizados');
                              } catch { toast.error('Erro ao calcular'); }
                            }}
                          >
                            <DollarSign className="h-3 w-3" />
                            Atualizar Juros/Multa
                          </Button>

                          {/* Charge list */}
                          {context?.charges.map((charge) => (
                            <Card key={charge.id} className="mb-0">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">
                                    R$ {charge.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <Badge variant={charge.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                                    {charge.status === 'paid' ? 'Pago' : charge.status === 'overdue' ? 'Vencido' : 'Pendente'}
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
                          ))}
                        </>
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
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <MessageTemplates />
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="flex-1 overflow-hidden">
            <KnowledgeBase 
              instanceId={activeInstance?.id || ''} 
              administratorId={activeInstance?.admin_field_01 || undefined}
            />
          </div>
        )}

        {/* Instances Tab */}
        {activeTab === 'instances' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Instâncias WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">
                    Gerencie suas conexões WhatsApp
                  </p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Instância
                </Button>
              </div>

              {loadingInstances ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : instances?.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Nenhuma instância configurada</p>
                    <Button onClick={() => setIsWizardOpen(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Conectar WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {instances?.map((instance) => (
                    <Card key={instance.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              instance.status === 'connected' ? 'bg-green-500/10' : 'bg-muted'
                            }`}>
                              {instance.status === 'connected' ? (
                                <Wifi className="h-6 w-6 text-green-600" />
                              ) : (
                                <WifiOff className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{instance.name}</span>
                                {instance.is_default && (
                                  <Badge variant="outline" className="text-xs">Padrão</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {instance.phone_number ? formatPhoneDisplay(instance.phone_number) : 'Número não conectado'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {instance.instance_type || 'cobranca'}
                                </Badge>
                                {instance.is_autonomous && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Bot className="h-3 w-3" />
                                    Autônoma
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={instance.status === 'connected' ? 'default' : 'secondary'}
                              className={instance.status === 'connected' ? 'bg-green-500' : ''}
                            >
                              {instance.status === 'connected' ? 'Online' : 'Offline'}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedInstance(instance);
                              setActiveTab('knowledge');
                            }}>
                              <Brain className="h-4 w-4 mr-1" />
                              Base IA
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={async () => {
                                    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;
                                    try {
                                      await supabase.functions.invoke('uazapi-connect', {
                                        body: {
                                          action: 'disconnect',
                                          instanceToken: instance.api_key,
                                        },
                                      });
                                      await supabase
                                        .from('uazapi_instances')
                                        .delete()
                                        .eq('id', instance.id);
                                      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
                                      toast.success('Instância excluída');
                                    } catch (err) {
                                      toast.error('Erro ao excluir instância');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection Wizard */}
      <ConnectionWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
          setIsWizardOpen(false);
        }}
      />
    </CorporateLayout>
  );
}
