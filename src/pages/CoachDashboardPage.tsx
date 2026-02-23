import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CorporateLayout } from '@/components/CorporateLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Brain, Target, TrendingUp, MessageSquare, Clock, 
  CheckCircle, AlertCircle, BarChart3, Activity, Users,
  RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

export default function CoachDashboardPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const startDate = subDays(new Date(), daysBack).toISOString();

  // Fetch intents
  const { data: intents, isLoading: loadingIntents } = useQuery({
    queryKey: ['coaching-intents', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_intents')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Fetch coaching sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['coaching-sessions-stats', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch conversations with AI data
  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, phone_number, contact_name, ai_intent, ai_intent_confidence, ai_recovery_score, intended_payment_date, status, last_message_at')
        .not('ai_intent', 'is', null)
        .gte('last_message_at', startDate)
        .order('last_message_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Compute intent stats
  const intentStats = intents?.reduce((acc, intent) => {
    acc[intent.intent_type] = (acc[intent.intent_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const intentLabels: Record<string, string> = {
    request_boleto: 'Solicitar Boleto',
    request_negotiation: 'Negociação',
    confirm_payment: 'Confirmar Pagamento',
    ask_question: 'Pergunta',
    upload_proof: 'Comprovante',
    dispute: 'Contestação',
    request_human: 'Atendente Humano',
    general: 'Geral',
    payment_intent: 'Intenção de Pagamento',
  };

  const intentColors: Record<string, string> = {
    request_boleto: 'bg-blue-100 text-blue-800',
    request_negotiation: 'bg-purple-100 text-purple-800',
    confirm_payment: 'bg-green-100 text-green-800',
    ask_question: 'bg-amber-100 text-amber-800',
    upload_proof: 'bg-emerald-100 text-emerald-800',
    dispute: 'bg-red-100 text-red-800',
    request_human: 'bg-orange-100 text-orange-800',
    general: 'bg-gray-100 text-gray-800',
    payment_intent: 'bg-teal-100 text-teal-800',
  };

  const totalIntents = intents?.length || 0;
  const avgConfidence = intents?.length 
    ? (intents.reduce((sum, i) => sum + (i.confidence || 0), 0) / intents.length * 100).toFixed(0)
    : '0';

  const activeSessions = sessions?.filter(s => s.session_status === 'active').length || 0;
  const completedSessions = sessions?.filter(s => s.session_status === 'completed').length || 0;

  const highScoreConversations = conversations?.filter(c => (c.ai_recovery_score || 0) >= 70).length || 0;
  const paymentIntentConversations = conversations?.filter(c => c.intended_payment_date).length || 0;

  return (
    <CorporateLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Coach & Inteligência IA</h1>
              <p className="text-sm text-muted-foreground">
                Painel de intenções, métricas e análise de recuperação
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : '90 dias'}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Intenções Detectadas</p>
                  <p className="text-2xl font-bold">{totalIntents}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Confiança média: {avgConfidence}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score Alto (≥70)</p>
                  <p className="text-2xl font-bold text-green-600">{highScoreConversations}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Conversas com alta chance de recuperação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Intenções de Pagamento</p>
                  <p className="text-2xl font-bold text-blue-600">{paymentIntentConversations}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Devedores que indicaram data de pagamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessões Coach</p>
                  <p className="text-2xl font-bold">{activeSessions}</p>
                </div>
                <Users className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ativas / {completedSessions} concluídas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="intents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="intents" className="gap-1">
              <Target className="h-3.5 w-3.5" />
              Intenções
            </TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Sessões
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Intents Tab */}
          <TabsContent value="intents" className="space-y-4">
            {/* Intent Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição de Intenções</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(intentStats)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <Badge className={`text-xs ${intentColors[type] || 'bg-gray-100 text-gray-800'}`}>
                          {intentLabels[type] || type}
                        </Badge>
                        <p className="text-lg font-bold mt-1">{count}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {((count / totalIntents) * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Intents List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Intenções Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {loadingIntents ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : intents?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhuma intenção registrada</p>
                    ) : (
                      intents?.slice(0, 50).map((intent) => (
                        <div key={intent.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-xs ${intentColors[intent.intent_type] || 'bg-gray-100'}`}>
                                {intentLabels[intent.intent_type] || intent.intent_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {intent.confidence ? `${(intent.confidence * 100).toFixed(0)}% confiança` : ''}
                              </span>
                            </div>
                            <p className="text-sm truncate">{intent.message_content || '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {intent.phone_number} • {format(new Date(intent.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {intent.pipeline_stage_after && intent.pipeline_stage_before !== intent.pipeline_stage_after && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">{intent.pipeline_stage_before || '—'}</span>
                              <ArrowUpRight className="h-3 w-3 text-green-500" />
                              <span className="font-medium">{intent.pipeline_stage_after}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scoring de Recuperação por Conversa</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {conversations?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum scoring calculado ainda</p>
                    ) : (
                      conversations?.map((conv) => (
                        <div key={conv.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{conv.contact_name || conv.phone_number}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {conv.ai_intent && (
                                <Badge className={`text-xs ${intentColors[conv.ai_intent] || 'bg-gray-100'}`}>
                                  {intentLabels[conv.ai_intent] || conv.ai_intent}
                                </Badge>
                              )}
                              {conv.intended_payment_date && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pagar em {format(new Date(conv.intended_payment_date), 'dd/MM')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              (conv.ai_recovery_score || 0) >= 70 ? 'text-green-600' :
                              (conv.ai_recovery_score || 0) >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {conv.ai_recovery_score || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">score</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sessões de Coaching</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {loadingSessions ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sessions?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhuma sessão encontrada</p>
                    ) : (
                      sessions?.map((session) => (
                        <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                          <div className={`w-3 h-3 rounded-full ${
                            session.session_status === 'active' ? 'bg-green-500' :
                            session.session_status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{session.phone_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.session_type} • Passo {session.current_step}/{session.total_steps}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={session.session_status === 'active' ? 'default' : 'secondary'}>
                              {session.session_status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(session.last_interaction_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Histórico de Interações IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {intents?.slice(0, 100).map((intent) => (
                      <div key={intent.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            intent.intent_type === 'confirm_payment' ? 'bg-green-500' :
                            intent.intent_type === 'dispute' ? 'bg-red-500' :
                            intent.intent_type === 'request_human' ? 'bg-orange-500' :
                            'bg-primary'
                          }`} />
                          <div className="w-px flex-1 bg-border" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${intentColors[intent.intent_type] || 'bg-gray-100'}`}>
                              {intentLabels[intent.intent_type] || intent.intent_type}
                            </Badge>
                            {intent.action_taken && (
                              <span className="text-xs text-muted-foreground">→ {intent.action_taken}</span>
                            )}
                          </div>
                          <p className="text-sm">{intent.message_content || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {intent.phone_number} • {format(new Date(intent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CorporateLayout>
  );
}
