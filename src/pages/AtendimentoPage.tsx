import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Search, Phone, Mail, Send, Paperclip, 
  FileText, Calculator, Clock, CheckCircle, AlertCircle,
  User, Building2, DollarSign, Bot, Zap, Play, Pause,
  RefreshCw, ChevronRight, ArrowRight, Brain, Sparkles,
  Upload, Eye, FileImage
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  status: string;
  unread_count: number;
  unit_id: string | null;
  unit?: {
    unit_number: string;
    owner_name: string | null;
    owner_email: string | null;
    condominiums: {
      name: string;
    } | null;
  } | null;
  charges?: {
    id: string;
    amount: number;
    due_date: string;
    status: string;
    reference_month: string | null;
  }[];
}

interface Message {
  id: string;
  content: string | null;
  direction: string;
  created_at: string;
  message_type: string;
  status: string;
  media_url: string | null;
  sender_phone: string | null;
}

interface AgentAction {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AtendimentoPage = () => {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agentActive, setAgentActive] = useState(true);
  const [agentThinking, setAgentThinking] = useState(false);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('whatsapp_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          console.log('📬 Nova mensagem recebida:', payload);
          if (selectedConversation && (payload.new as any)?.conversation_id === selectedConversation.id) {
            loadMessages(selectedConversation.id);
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          phone_number,
          contact_name,
          last_message_preview,
          last_message_at,
          status,
          unread_count,
          unit_id,
          units (
            unit_number,
            owner_name,
            owner_email,
            condominiums (name)
          )
        `)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar cobranças para cada conversa com unit_id
      const conversationsWithCharges = await Promise.all(
        (data || []).map(async (conv: any) => {
          let charges: any[] = [];
          if (conv.unit_id) {
            const { data: chargesData } = await supabase
              .from('charges')
              .select('id, amount, due_date, status, reference_month')
              .eq('unit_id', conv.unit_id)
              .in('status', ['pending', 'overdue'])
              .order('due_date', { ascending: true })
              .limit(5);
            charges = chargesData || [];
          }
          return {
            ...conv,
            unit: conv.units,
            charges,
          };
        })
      );

      setConversations(conversationsWithCharges);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);

    // Marcar como lidas
    await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: selectedConversation.phone_number,
          message: newMessage,
          conversationId: selectedConversation.id
        }
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedConversation.id);

      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada com sucesso'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const triggerAgentAction = async (action: string) => {
    if (!selectedConversation) return;

    setAgentThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('langgraph-agent', {
        body: {
          conversationId: selectedConversation.id,
          phone: selectedConversation.phone_number,
          message: `[SYSTEM_ACTION:${action}]`,
          messageType: 'system'
        }
      });

      if (error) throw error;

      toast({
        title: 'Ação executada',
        description: `O agente executou: ${action}`
      });

      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error triggering agent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao executar ação do agente',
        variant: 'destructive'
      });
    } finally {
      setAgentThinking(false);
    }
  };

  const sendChargeDetails = async () => {
    if (!selectedConversation) return;

    // Verificar se há cobranças pendentes vinculadas
    const pendingCharge = selectedConversation.charges?.find(c => c.status === 'pending' || c.status === 'overdue');
    
    if (!pendingCharge) {
      toast({
        title: 'Sem cobrança vinculada',
        description: 'Não há cobranças pendentes para esta conversa. Vincule uma unidade com cobranças primeiro.',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-charge-notification', {
        body: {
          chargeId: pendingCharge.id,
          channel: 'whatsapp'
        }
      });

      if (error) throw error;

      toast({
        title: 'Cobrança enviada',
        description: 'Os detalhes da cobrança foram enviados via WhatsApp'
      });

      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending charge:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar cobrança',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.phone_number?.includes(searchTerm) || 
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.unit?.condominiums?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'waiting': case 'waiting_proof': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'resolved': case 'closed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'escalated': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const agentActions: AgentAction[] = [
    { type: 'send_boleto', label: 'Enviar Boleto', description: 'Gera e envia novo boleto', icon: <FileText className="h-4 w-4" /> },
    { type: 'calculate_fees', label: 'Calcular Juros', description: 'Calcula valor atualizado', icon: <Calculator className="h-4 w-4" /> },
    { type: 'propose_negotiation', label: 'Propor Acordo', description: 'Oferece parcelamento', icon: <DollarSign className="h-4 w-4" /> },
    { type: 'request_proof', label: 'Pedir Comprovante', description: 'Solicita comprovante', icon: <Upload className="h-4 w-4" /> },
  ];

  const totalDebt = selectedConversation?.charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Lista de Conversas */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Atendimentos</h2>
            <Button variant="ghost" size="icon" onClick={loadConversations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {conv.contact_name?.[0] || conv.phone_number?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conv.contact_name || conv.phone_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(conv.last_message_at)}
                      </span>
                    </div>
                    {conv.unit?.condominiums?.name && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {conv.unit.condominiums.name} - {conv.unit.unit_number}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview || 'Sem mensagens'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getStatusColor(conv.status)}`}>
                        {conv.status}
                      </Badge>
                      {conv.charges && conv.charges.length > 0 && (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                          {formatCurrency(conv.charges.reduce((s, c) => s + Number(c.amount), 0))}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-card border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedConversation.contact_name?.[0] || selectedConversation.phone_number?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.unit?.condominiums?.name} - {selectedConversation.unit?.unit_number || selectedConversation.phone_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <Bot className={`h-4 w-4 ${agentActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <Label htmlFor="agent-toggle" className="text-sm">Agente IA</Label>
                  <Switch
                    id="agent-toggle"
                    checked={agentActive}
                    onCheckedChange={setAgentActive}
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-1" />
                  Ligar
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.message_type === 'image' && msg.media_url && (
                        <div className="mb-2">
                          <img 
                            src={msg.media_url} 
                            alt="Imagem" 
                            className="max-w-full rounded cursor-pointer hover:opacity-90"
                            onClick={() => window.open(msg.media_url!, '_blank')}
                          />
                        </div>
                      )}
                      {msg.message_type === 'document' && msg.media_url && (
                        <a 
                          href={msg.media_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm underline mb-2"
                        >
                          <FileText className="h-4 w-4" />
                          Ver documento
                        </a>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1 text-xs mt-1 ${
                        msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="ml-1">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Ações Rápidas */}
            <div className="p-2 bg-card border-t flex items-center gap-2 overflow-x-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={sendChargeDetails}
                disabled={sending}
              >
                <FileText className="h-4 w-4 mr-1" />
                Enviar Cobrança
              </Button>
              <Button variant="outline" size="sm" onClick={() => triggerAgentAction('calculate_fees')}>
                <Calculator className="h-4 w-4 mr-1" />
                Calcular
              </Button>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-1" />
                Anexar
              </Button>
              <Button variant="outline" size="sm" onClick={() => triggerAgentAction('propose_negotiation')}>
                <DollarSign className="h-4 w-4 mr-1" />
                Negociar
              </Button>
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-card border-t">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[60px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa à esquerda para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel do Agente IA */}
      {selectedConversation && (
        <div className="w-80 border-l bg-card flex flex-col">
          <Tabs defaultValue="agent" className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b grid grid-cols-3">
              <TabsTrigger value="agent" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                Agente
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Info
              </TabsTrigger>
              <TabsTrigger value="charges" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                Débitos
              </TabsTrigger>
            </TabsList>

            {/* Tab Agente */}
            <TabsContent value="agent" className="flex-1 p-4 m-0 overflow-y-auto">
              <div className="space-y-4">
                {/* Status do Agente */}
                <Card className={agentActive ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className={`h-4 w-4 ${agentActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                      Agente Autônomo
                      {agentThinking && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {agentActive 
                        ? 'Respondendo automaticamente' 
                        : 'Modo manual ativado'}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Ações do Agente */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Ações Rápidas
                  </h4>
                  <div className="space-y-2">
                    {agentActions.map((action) => (
                      <Button
                        key={action.type}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => triggerAgentAction(action.type)}
                        disabled={agentThinking}
                      >
                        <div className="flex items-start gap-2">
                          {action.icon}
                          <div>
                            <p className="font-medium text-xs">{action.label}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Contexto do Agente */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Contexto Detectado
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Identificado:</span>
                      <span className="font-medium">
                        {selectedConversation.unit ? '✅ Sim' : '❌ Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Cobranças:</span>
                      <span className="font-medium">{selectedConversation.charges?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Débito Total:</span>
                      <span className="font-medium text-destructive">{formatCurrency(totalDebt)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={`text-xs ${getStatusColor(selectedConversation.status)}`}>
                        {selectedConversation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Info */}
            <TabsContent value="info" className="flex-1 p-4 m-0 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.contact_name || selectedConversation.unit?.owner_name || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.unit?.owner_email || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Unidade</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.unit 
                        ? `${selectedConversation.unit.condominiums?.name} - ${selectedConversation.unit.unit_number}`
                        : 'Não vinculado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Débito Total</p>
                    <p className="text-sm font-semibold text-destructive">
                      {formatCurrency(totalDebt)}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Cobranças */}
            <TabsContent value="charges" className="flex-1 p-4 m-0 overflow-y-auto">
              {selectedConversation.charges && selectedConversation.charges.length > 0 ? (
                <div className="space-y-3">
                  {selectedConversation.charges.map((charge) => (
                    <Card key={charge.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {charge.reference_month || 'Sem ref.'}
                        </span>
                        <Badge variant={charge.status === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
                          {charge.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </Badge>
                      </div>
                      <p className="font-semibold">{formatCurrency(charge.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 flex-1">
                          <FileText className="h-3 w-3 mr-1" />
                          Boleto
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma cobrança encontrada</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AtendimentoPage;