import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Search, Phone, Mail, Send, Paperclip, 
  FileText, Calculator, Clock, CheckCircle, AlertCircle,
  User, Building2, DollarSign
} from 'lucide-react';

interface Conversation {
  id: string;
  phone_number: string;
  last_message: string;
  last_interaction_at: string;
  session_status: string;
  unit_name?: string;
  owner_name?: string;
  pending_amount?: number;
}

interface Message {
  id: string;
  content: string;
  direction: string;
  created_at: string;
  message_type: string;
}

const AtendimentoPage = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data: sessions, error } = await supabase
        .from('coaching_sessions')
        .select(`
          id,
          phone_number,
          session_status,
          last_interaction_at,
          unit_id,
          units (
            unit_number,
            owner_name,
            condominiums (name)
          )
        `)
        .order('last_interaction_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Buscar última mensagem de cada sessão
      const conversationsWithMessages = await Promise.all(
        (sessions || []).map(async (session: any) => {
          const { data: lastMsg } = await supabase
            .from('coaching_messages')
            .select('content')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Buscar cobranças pendentes
          let pendingAmount = 0;
          if (session.unit_id) {
            const { data: charges } = await supabase
              .from('charges')
              .select('amount')
              .eq('unit_id', session.unit_id)
              .in('status', ['pending', 'overdue']);
            
            pendingAmount = charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
          }

          return {
            id: session.id,
            phone_number: session.phone_number,
            last_message: lastMsg?.content || 'Sem mensagens',
            last_interaction_at: session.last_interaction_at,
            session_status: session.session_status,
            unit_name: session.units ? `${session.units.condominiums?.name || ''} - ${session.units.unit_number}` : undefined,
            owner_name: session.units?.owner_name,
            pending_amount: pendingAmount
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('coaching_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      // Enviar via UAZAPI
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: selectedConversation.phone_number,
          message: newMessage,
          sessionId: selectedConversation.id
        }
      });

      if (error) throw error;

      // Adicionar mensagem localmente
      const newMsg: Message = {
        id: crypto.randomUUID(),
        content: newMessage,
        direction: 'outbound',
        created_at: new Date().toISOString(),
        message_type: 'text'
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');

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

  const sendChargeDetails = async () => {
    if (!selectedConversation) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-charge-notification', {
        body: {
          phone: selectedConversation.phone_number,
          sessionId: selectedConversation.id,
          type: 'details'
        }
      });

      if (error) throw error;

      toast({
        title: 'Cobrança enviada',
        description: 'Os detalhes da cobrança foram enviados'
      });

      loadMessages(selectedConversation.id);
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
    c.phone_number.includes(searchTerm) || 
    c.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.unit_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Lista de Conversas */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-ffp-navy mb-3">Atendimentos</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Carregando...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
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
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-ffp-navy text-white text-sm">
                      {conv.owner_name?.[0] || conv.phone_number[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conv.owner_name || conv.phone_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(conv.last_interaction_at)}
                      </span>
                    </div>
                    {conv.unit_name && (
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {conv.unit_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getStatusColor(conv.session_status)}`}>
                        {conv.session_status}
                      </Badge>
                      {conv.pending_amount && conv.pending_amount > 0 && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                          R$ {conv.pending_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-ffp-navy text-white">
                    {selectedConversation.owner_name?.[0] || selectedConversation.phone_number[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.owner_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.unit_name || selectedConversation.phone_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                          ? 'bg-ffp-navy text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Ações Rápidas */}
            <div className="p-2 bg-white border-t flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={sendChargeDetails}
                disabled={sending}
              >
                <FileText className="h-4 w-4 mr-1" />
                Enviar Cobrança
              </Button>
              <Button variant="outline" size="sm">
                <Calculator className="h-4 w-4 mr-1" />
                Calcular
              </Button>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-1" />
                Anexar
              </Button>
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-white border-t">
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
                  className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy"
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
              <p>Selecione uma conversa para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel de Informações */}
      {selectedConversation && (
        <div className="w-80 border-l bg-white">
          <Tabs defaultValue="info" className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              <TabsTrigger value="charges" className="flex-1">Cobranças</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 p-4 m-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.owner_name || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.phone_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Unidade</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.unit_name || 'Não vinculado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Débito Total</p>
                    <p className="text-sm text-red-600 font-semibold">
                      R$ {(selectedConversation.pending_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="charges" className="flex-1 p-4 m-0">
              <p className="text-sm text-muted-foreground text-center">
                Cobranças vinculadas aparecerão aqui
              </p>
            </TabsContent>

            <TabsContent value="history" className="flex-1 p-4 m-0">
              <p className="text-sm text-muted-foreground text-center">
                Histórico de atendimentos aparecerá aqui
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AtendimentoPage;