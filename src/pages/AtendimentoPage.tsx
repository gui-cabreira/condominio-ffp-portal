import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/components/ui/sidebar';
import { 
  MessageSquare, Search, Phone, Mail, Send, Paperclip, 
  FileText, Calculator, Clock, CheckCircle, AlertCircle,
  User, Building2, DollarSign, Bot, Zap, Play, Pause,
  RefreshCw, ChevronRight, ArrowRight, Brain, Sparkles,
  Upload, Eye, FileImage, Download, Image as ImageIcon,
  CheckCheck, Check, Video, Music, UserPlus, Target,
  ArrowDownCircle, Link2
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import RegisterContactDialog from '@/components/RegisterContactDialog';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  status: string;
  unread_count: number;
  unit_id: string | null;
  avatar_url: string | null;
  ai_intent: string | null;
  ai_intent_confidence: number | null;
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
  caption: string | null;
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
  const { setOpen } = useSidebar();
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
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [expandedChargeId, setExpandedChargeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boletoInputRef = useRef<HTMLInputElement>(null);
  const [suggestedUnits, setSuggestedUnits] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [baixaChargeId, setBaixaChargeId] = useState<string | null>(null);
  const [baixaPaymentDate, setBaixaPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [baixaNotes, setBaixaNotes] = useState('');
  const [uploadingBoleto, setUploadingBoleto] = useState(false);
  const [uploadChargeId, setUploadChargeId] = useState<string | null>(null);

  // Auto-collapse sidebar when entering Atendimento
  useEffect(() => {
    setOpen(false);
  }, []);

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
          avatar_url,
          ai_intent,
          ai_intent_confidence,
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

      // Show detailed feedback based on action result
      const result = data?.result;
      if (result?.error) {
        toast({
          title: 'Atenção',
          description: result.error,
          variant: 'destructive'
        });
      } else if (action === 'calculate_fees' && result) {
        toast({
          title: '🧮 Cálculo Atualizado',
          description: `Principal: R$ ${result.principal?.toFixed(2)} | Multa: R$ ${result.fineAmount?.toFixed(2)} | Juros: R$ ${result.interestAmount?.toFixed(2)} | Total: R$ ${result.totalAmount?.toFixed(2)} (${result.daysLate} dias de atraso)`,
        });
      } else if (action === 'propose_negotiation' && result) {
        toast({
          title: '💰 Proposta Enviada',
          description: `Débito: R$ ${result.totalDebt?.toFixed(2)} → Com desconto: R$ ${result.discountedAmount?.toFixed(2)} (${result.discountPercent}% off) · Até ${result.maxInstallments}x de R$ ${result.installmentValue?.toFixed(2)}`,
        });
      } else if (action === 'send_boleto' && result) {
        toast({
          title: '📄 Boleto Enviado',
          description: `Cobrança de R$ ${result.amount?.toFixed(2)} enviada via WhatsApp`,
        });
      } else if (action === 'request_proof') {
        toast({
          title: '📎 Solicitação Enviada',
          description: 'Comprovante solicitado ao devedor via WhatsApp',
        });
      } else if (action === 'escalate_human') {
        toast({
          title: '🧑 Escalado',
          description: 'Conversa transferida para atendente humano. Notificações enviadas.',
        });
      } else {
        toast({
          title: 'Ação executada',
          description: `Ação ${action} executada com sucesso`
        });
      }

      await loadMessages(selectedConversation.id);
      await loadConversations();
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

  const sendBoletoForCharge = async (chargeId: string) => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-charge-notification', {
        body: { chargeId, channel: 'whatsapp' }
      });
      if (error) throw error;
      toast({ title: 'Boleto enviado', description: 'O boleto foi enviado via WhatsApp' });
      if (selectedConversation) await loadMessages(selectedConversation.id);
    } catch (error: any) {
      console.error('Error sending boleto:', error);
      toast({ title: 'Erro', description: 'Erro ao enviar boleto', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    
    setSending(true);
    try {
      // Upload to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(`attachments/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('boletos')
        .getPublicUrl(`attachments/${fileName}`);

      // Send via WhatsApp
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: selectedConversation.phone_number,
          message: file.name,
          conversationId: selectedConversation.id,
          mediaUrl: urlData.publicUrl,
          mediaType: file.type.startsWith('image/') ? 'image' : 'document',
        }
      });

      if (error) throw error;

      toast({ title: 'Arquivo enviado', description: `${file.name} enviado com sucesso` });
      await loadMessages(selectedConversation.id);
    } catch (error: any) {
      console.error('Error attaching file:', error);
      toast({ title: 'Erro', description: 'Erro ao enviar arquivo', variant: 'destructive' });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Smart contact suggestion - match contact_name to units owner_name
  const findSuggestedUnits = async (contactName: string | null) => {
    if (!contactName || contactName.length < 3) {
      setSuggestedUnits([]);
      return;
    }
    const { data } = await supabase
      .from('units')
      .select('id, unit_number, owner_name, owner_phone, condominium_id, condominiums(name)')
      .or(`owner_name.ilike.%${contactName}%,owner_phone.ilike.%${contactName}%`)
      .limit(5);
    setSuggestedUnits(data || []);
    if (data && data.length > 0) setShowSuggestions(true);
  };

  // When selecting a conversation without unit_id, try to find suggestions
  useEffect(() => {
    if (selectedConversation && !selectedConversation.unit_id) {
      findSuggestedUnits(selectedConversation.contact_name);
    } else {
      setShowSuggestions(false);
      setSuggestedUnits([]);
    }
  }, [selectedConversation?.id]);

  const linkSuggestedUnit = async (unitId: string, condoId: string) => {
    if (!selectedConversation) return;
    await supabase
      .from('whatsapp_conversations')
      .update({ unit_id: unitId, condominium_id: condoId })
      .eq('id', selectedConversation.id);
    toast({ title: 'Contato vinculado!', description: 'Unidade associada com sucesso.' });
    setShowSuggestions(false);
    loadConversations();
  };

  // Dar baixa (confirm payment)
  const handleDarBaixa = async () => {
    if (!baixaChargeId) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('charges')
        .update({
          status: 'paid' as any,
          payment_date: baixaPaymentDate,
        })
        .eq('id', baixaChargeId);
      if (error) throw error;

      // Add timeline entry
      await supabase.from('charge_timeline').insert({
        charge_id: baixaChargeId,
        event_type: 'payment_confirmed',
        event_data: {
          payment_date: baixaPaymentDate,
          notes: baixaNotes,
          confirmed_via: 'atendimento_crm',
        },
      });

      toast({ title: 'Baixa realizada!', description: 'Pagamento confirmado com sucesso.' });
      setBaixaDialogOpen(false);
      setBaixaChargeId(null);
      setBaixaNotes('');
      loadConversations();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Upload boleto and link to charge
  const handleBoletoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadChargeId) return;
    setUploadingBoleto(true);
    try {
      const fileName = `${uploadChargeId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('boletos')
        .getPublicUrl(fileName);

      await supabase
        .from('charges')
        .update({ boleto_url: urlData.publicUrl })
        .eq('id', uploadChargeId);

      await supabase.from('charge_timeline').insert({
        charge_id: uploadChargeId,
        event_type: 'boleto_attached',
        event_data: { file_name: file.name, url: urlData.publicUrl },
      });

      toast({ title: 'Boleto anexado!', description: `${file.name} vinculado à cobrança.` });
      setUploadChargeId(null);
      loadConversations();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingBoleto(false);
      if (boletoInputRef.current) boletoInputRef.current.value = '';
    }
  };

  const handleApplyWorkflow = async () => {
    if (!selectedConversation) return;

    const pendingCharge = selectedConversation.charges?.find(c => c.status === 'pending' || c.status === 'overdue');
    if (!pendingCharge) {
      toast({
        title: 'Sem cobrança vinculada',
        description: 'Vincule uma unidade com cobranças pendentes primeiro.',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      // Buscar workflows ativos
      // @ts-ignore - deep type instantiation
      const { data: workflows, error: wfError } = await (supabase as any)
        .from('workflows')
        .select('id, name')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (wfError) throw wfError;

      if (!workflows || workflows.length === 0) {
        toast({
          title: 'Sem workflow',
          description: 'Nenhum workflow ativo encontrado. Crie um em Configurações > Workflow.',
          variant: 'destructive'
        });
        return;
      }

      const workflow = workflows[0];

      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflow.id,
          charge_id: pendingCharge.id,
          status: 'pending',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (execError) throw execError;

      const { error: invokeError } = await supabase.functions.invoke('execute-workflow', {
        body: { executionId: execution.id }
      });

      if (invokeError) {
        console.error('Erro ao executar workflow:', invokeError);
      }

      toast({
        title: 'Workflow aplicado',
        description: `Workflow "${workflow.name}" iniciado para esta cobrança`
      });
    } catch (error) {
      console.error('Error applying workflow:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aplicar workflow',
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
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getIntentLabel = (intent: string | null) => {
    if (!intent) return null;
    const map: Record<string, { label: string; color: string }> = {
      // Nomes do langgraph-agent v2
      'request_boleto': { label: '📄 Quer Boleto', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      'request_negotiation': { label: '🤝 Negociação', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      'ask_question': { label: '❓ Dúvida', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
      'upload_proof': { label: '🧾 Comprovante', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      'confirm_payment': { label: '💰 Pagamento Confirmado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      'payment_intent': { label: '💳 Intenção Pgto', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
      'dispute': { label: '⚠️ Contestação', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      'request_human': { label: '👤 Escalar Humano', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      'general': { label: '💬 Geral', color: 'bg-muted text-muted-foreground' },
      // Fallbacks legados
      'quer_boleto': { label: '📄 Quer Boleto', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      'negociacao': { label: '🤝 Negociação', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      'esclarecimento': { label: '❓ Dúvida', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
      'comprovante': { label: '🧾 Comprovante', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
      'reclamacao': { label: '⚠️ Reclamação', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      'saudacao': { label: '👋 Saudação', color: 'bg-muted text-muted-foreground' },
      'pagamento': { label: '💰 Pagamento', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    };
    return map[intent] || { label: `🔹 ${intent}`, color: 'bg-muted text-muted-foreground' };
  };

  const agentActions: AgentAction[] = [
    { type: 'send_boleto', label: 'Enviar Boleto', description: 'Gera e envia novo boleto', icon: <FileText className="h-4 w-4" /> },
    { type: 'calculate_fees', label: 'Calcular Juros', description: 'Calcula valor atualizado', icon: <Calculator className="h-4 w-4" /> },
    { type: 'propose_negotiation', label: 'Propor Acordo', description: 'Oferece parcelamento', icon: <DollarSign className="h-4 w-4" /> },
    { type: 'request_proof', label: 'Pedir Comprovante', description: 'Solicita comprovante', icon: <Upload className="h-4 w-4" /> },
    { type: 'escalate_human', label: 'Escalar p/ Humano', description: 'Transferir para atendente', icon: <User className="h-4 w-4" /> },
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
                className={`p-4 border-b cursor-pointer transition-all duration-200 ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-primary/10 border-l-4 border-l-primary' 
                    : 'hover:bg-accent/80 hover:shadow-sm hover:border-l-4 hover:border-l-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.avatar_url || undefined} alt={conv.contact_name || ''} />
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
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(conv.status)}`}>
                        {conv.status}
                      </Badge>
                      {conv.ai_intent && (() => {
                        const intentInfo = getIntentLabel(conv.ai_intent);
                        return intentInfo ? (
                          <Badge className={`text-[10px] px-1.5 py-0 ${intentInfo.color}`}>
                            {intentInfo.label}
                          </Badge>
                        ) : null;
                      })()}
                      {conv.charges && conv.charges.length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                          {formatCurrency(conv.charges.reduce((s, c) => s + Number(c.amount), 0))}
                        </Badge>
                      )}
                      {!conv.unit_id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed">
                          Não vinculado
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
                  <AvatarImage src={selectedConversation.avatar_url || undefined} alt={selectedConversation.contact_name || ''} />
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

            {/* Smart Suggestion Banner */}
            {showSuggestions && suggestedUnits.length > 0 && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Possível correspondência encontrada:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedUnits.map((u: any) => (
                    <Button
                      key={u.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                      onClick={() => linkSuggestedUnit(u.id, u.condominium_id)}
                    >
                      <Link2 className="h-3 w-3" />
                      {(u.condominiums as any)?.name} - Un. {u.unit_number} ({u.owner_name})
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowSuggestions(false)}>
                    Ignorar
                  </Button>
                </div>
              </div>
            )}

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  const isMediaPlaceholder = ['[Imagem]', '[Áudio]', '[Vídeo]', '[Figurinha]', '[Documento]', '[Localização]', '[Contato]', '[mídia]'].includes(msg.content || '');
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOutbound
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {/* Image */}
                        {msg.message_type === 'image' && msg.media_url && (
                          <img 
                            src={msg.media_url} 
                            alt="Imagem" 
                            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.media_url!, '_blank')}
                            loading="lazy"
                          />
                        )}

                        {/* Video */}
                        {msg.message_type === 'video' && msg.media_url && (
                          <video
                            src={msg.media_url}
                            controls
                            className="max-w-full rounded-lg mb-2"
                            preload="metadata"
                          />
                        )}

                        {/* Audio */}
                        {msg.message_type === 'audio' && msg.media_url && (
                          <audio
                            src={msg.media_url}
                            controls
                            className="w-full mb-2"
                            preload="metadata"
                          />
                        )}

                        {/* Document */}
                        {msg.message_type === 'document' && msg.media_url && (
                          <a 
                            href={msg.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded bg-background/50 mb-2 hover:bg-background/80 transition-colors"
                          >
                            <FileText className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm underline truncate">{msg.caption || 'Documento'}</span>
                            <Download className="h-4 w-4 ml-auto flex-shrink-0" />
                          </a>
                        )}

                        {/* Sticker */}
                        {msg.message_type === 'sticker' && msg.media_url && (
                          <img
                            src={msg.media_url}
                            alt="Figurinha"
                            className="max-w-[150px] mb-2"
                            loading="lazy"
                          />
                        )}

                        {/* Text content (skip media placeholders) */}
                        {msg.content && !isMediaPlaceholder && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}

                        {/* Caption for media */}
                        {msg.caption && msg.caption !== msg.content && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1">{msg.caption}</p>
                        )}

                        {/* Timestamp + status */}
                        <div className={`flex items-center justify-end gap-1 text-xs mt-1 ${
                          isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {isOutbound && (
                            msg.status === 'read' ? (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : msg.status === 'failed' ? (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Ações Rápidas */}
            <div className="px-4 py-3 bg-card border-t flex items-center gap-3 overflow-x-auto">
              <Button 
                variant="secondary" 
                size="sm"
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={sendChargeDetails}
                disabled={sending}
              >
                <FileText className="h-4 w-4" />
                Enviar Cobrança
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => triggerAgentAction('calculate_fees')}
              >
                <Calculator className="h-4 w-4" />
                Calcular
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Anexar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileAttach}
              />
              <Button 
                variant="secondary" 
                size="sm" 
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => triggerAgentAction('propose_negotiation')}
              >
                <DollarSign className="h-4 w-4" />
                Negociar
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={handleApplyWorkflow}
                disabled={sending}
              >
                <Play className="h-4 w-4" />
                Aplicar Workflow
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button 
                variant="default" 
                size="sm" 
                className="shrink-0 gap-1.5 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setRegisterDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar
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
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={() => sendBoletoForCharge(charge.id)}
                          disabled={sending}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Enviar Boleto
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={() => {
                            setUploadChargeId(charge.id);
                            boletoInputRef.current?.click();
                          }}
                          disabled={uploadingBoleto}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Anexar Boleto
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={() => setExpandedChargeId(expandedChargeId === charge.id ? null : charge.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="text-xs h-7"
                          onClick={() => {
                            setBaixaChargeId(charge.id);
                            setBaixaDialogOpen(true);
                          }}
                        >
                          <ArrowDownCircle className="h-3 w-3 mr-1" />
                          Dar Baixa
                        </Button>
                      </div>
                      {expandedChargeId === charge.id && (
                        <div className="mt-2 pt-2 border-t space-y-1 text-xs text-muted-foreground">
                          <p>ID: {charge.id.slice(0, 8)}...</p>
                          <p>Valor: {formatCurrency(charge.amount)}</p>
                          <p>Vencimento: {new Date(charge.due_date).toLocaleDateString('pt-BR')}</p>
                          <p>Status: {charge.status}</p>
                          <p>Ref: {charge.reference_month || '-'}</p>
                        </div>
                      )}
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
      {selectedConversation && (
        <RegisterContactDialog
          open={registerDialogOpen}
          onOpenChange={setRegisterDialogOpen}
          conversationId={selectedConversation.id}
          phoneNumber={selectedConversation.phone_number}
          contactName={selectedConversation.contact_name}
          onComplete={() => {
            loadConversations();
            if (selectedConversation) {
              // Reload the selected conversation
              loadConversations();
            }
          }}
        />
      )}

      {/* Hidden boleto upload input */}
      <input
        ref={boletoInputRef}
        type="file"
        className="hidden"
        accept=".pdf,image/*"
        onChange={handleBoletoUpload}
      />

      {/* Dar Baixa Dialog */}
      <Dialog open={baixaDialogOpen} onOpenChange={setBaixaDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5" />
              Confirmar Pagamento
            </DialogTitle>
            <DialogDescription>
              Informe a data do pagamento para dar baixa nesta cobrança.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Data do Pagamento</Label>
              <Input
                type="date"
                value={baixaPaymentDate}
                onChange={(e) => setBaixaPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Pago via PIX, comprovante recebido..."
                value={baixaNotes}
                onChange={(e) => setBaixaNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDarBaixa} disabled={sending}>
              {sending ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AtendimentoPage;