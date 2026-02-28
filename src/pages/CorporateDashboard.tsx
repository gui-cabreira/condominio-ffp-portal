import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, DollarSign, Users, Building2, TrendingUp, 
  AlertTriangle, Clock, MessageSquare, ArrowRight, 
  CalendarClock, Phone, ChevronRight, Zap, Bell, 
  CheckCircle, XCircle, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/formatters';
import { useDashboardStats, useCondominiums, useMonthlyData, useStatusData } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

// Hook: cobranças vencidas urgentes
function useOverdueCharges() {
  return useQuery({
    queryKey: ['overdue-charges-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('charges')
        .select('id, amount, due_date, description, reference_month, unit_id, units(unit_number, owner_name, condominiums(name))')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(10);
      return data || [];
    },
  });
}

// Hook: últimas conversas WhatsApp com atividade
function useRecentConversations() {
  return useQuery({
    queryKey: ['recent-conversations-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('id, phone_number, contact_name, last_message_preview, last_message_at, unread_count, ai_intent, status')
        .order('last_message_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });
}

// Hook: notificações recentes do usuário
function useRecentNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['recent-notifications-dashboard', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getDaysOverdue(dueDateStr: string) {
  const due = new Date(dueDateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

function getIntentBadge(intent: string | null) {
  switch (intent) {
    case 'boleto_request': return { label: '📄 Boleto', variant: 'default' as const };
    case 'negotiation': return { label: '🤝 Acordo', variant: 'secondary' as const };
    case 'payment_proof': return { label: '🧾 Comprovante', variant: 'outline' as const };
    case 'complaint': return { label: '😤 Reclamação', variant: 'destructive' as const };
    default: return null;
  }
}

const CorporateDashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: condominiums, isLoading: condosLoading } = useCondominiums();
  const { data: monthlyData } = useMonthlyData();
  const { data: statusData } = useStatusData();
  const { data: overdueCharges } = useOverdueCharges();
  const { data: recentConversations } = useRecentConversations();
  const { data: recentNotifications } = useRecentNotifications(user?.id);

  if (statsLoading || condosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const urgentCount = (overdueCharges?.length || 0) + (recentNotifications?.length || 0);

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Visão geral da operação</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/portal/corporativo/cobrancas">
              <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1.5" />Cobranças</Button>
            </Link>
            <Link to="/portal/corporativo/atendimento">
              <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-1.5" />Atendimento</Button>
            </Link>
            <Link to="/portal/corporativo/crm">
              <Button size="sm" className="bg-primary text-primary-foreground"><BarChart3 className="w-4 h-4 mr-1.5" />CRM Pipeline</Button>
            </Link>
          </div>
        </div>

        {/* Alertas Urgentes */}
        {urgentCount > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base text-destructive">Atenção Necessária</CardTitle>
                <Badge variant="destructive" className="ml-auto">{urgentCount} itens</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(recentNotifications || []).slice(0, 3).map((n: any) => (
                  <Link key={n.id} to={n.action_url || '/portal/corporativo/notificacoes'} className="flex items-start gap-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Bell className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                  </Link>
                ))}
                {(overdueCharges || []).slice(0, 3).map((charge: any) => {
                  const days = getDaysOverdue(charge.due_date);
                  return (
                    <Link key={charge.id} to="/portal/corporativo/cobrancas" className="flex items-start gap-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Clock className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(charge.units as any)?.condominiums?.name} - Un. {(charge.units as any)?.unit_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(charge.amount)} · Vencida há {days} dias
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Total em Cobrança</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">
                R$ {stats?.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Condomínios</span>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.condominiumsCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats?.unitsCount} unidades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Taxa de Sucesso</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.successRate}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cobranças pagas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Automação</span>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.automationRate}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Taxa de sucesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Tempo Médio</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">{stats?.avgResolutionDays}d</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Resolução</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: Cobranças vencidas + Conversas recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cobranças Vencidas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-base">Cobranças Vencidas</CardTitle>
                </div>
                <Link to="/portal/corporativo/cobrancas">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Ver todas <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[320px]">
                {(!overdueCharges || overdueCharges.length === 0) ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma cobrança vencida</p>
                  </div>
                ) : (
                  overdueCharges.map((charge: any) => {
                    const days = getDaysOverdue(charge.due_date);
                    return (
                      <div key={charge.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          days > 30 ? "bg-destructive" : days > 15 ? "bg-orange-500" : "bg-yellow-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {(charge.units as any)?.owner_name || 'Sem proprietário'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {(charge.units as any)?.condominiums?.name} · Un. {(charge.units as any)?.unit_number}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold">{formatCurrency(charge.amount)}</p>
                          <p className="text-[10px] text-destructive font-medium">{days}d vencida</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Mensagens Recentes WhatsApp */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Mensagens Recentes</CardTitle>
                </div>
                <Link to="/portal/corporativo/atendimento">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Atendimento <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[320px]">
                {(!recentConversations || recentConversations.length === 0) ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma conversa recente</p>
                  </div>
                ) : (
                  recentConversations.map((conv: any) => {
                    const intentBadge = getIntentBadge(conv.ai_intent);
                    return (
                      <Link 
                        key={conv.id} 
                        to="/portal/corporativo/atendimento" 
                        className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {(conv.contact_name || conv.phone_number)?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">
                              {conv.contact_name || conv.phone_number}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="h-4 min-w-[16px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(conv.last_message_at)}</span>
                          {intentBadge && (
                            <Badge variant={intentBadge.variant} className="text-[10px] h-4 px-1.5">
                              {intentBadge.label}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Arrecadação Mensal */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Arrecadação Mensal</CardTitle>
              <CardDescription>Esperado vs Arrecadado</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                  <Area type="monotone" dataKey="expected" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted) / 0.3)" name="Esperado" />
                  <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Arrecadado" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status dos Pagamentos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Pagamentos</CardTitle>
              <CardDescription>Distribuição atual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {(statusData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {(statusData || []).map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-muted-foreground">{entry.name} {entry.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Condomínios em Destaque */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Condomínios</CardTitle>
                <CardDescription>Performance de cobrança por condomínio</CardDescription>
              </div>
              <Link to="/portal/corporativo/condominios">
                <Button variant="outline" size="sm">Ver Todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(condominiums || []).slice(0, 6).map((condo: any) => (
                <Link key={condo.id} to={`/portal/corporativo/condominio/${condo.id}`}>
                  <div className="p-3 rounded-lg border hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{condo.name}</h3>
                        <p className="text-xs text-muted-foreground">{condo.totalUnits} unidades</p>
                      </div>
                      <p className="text-sm font-semibold text-primary flex-shrink-0">{condo.pendingAmount}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Pagamento</span>
                        <span className="text-[11px] font-medium">{condo.efficiency}%</span>
                      </div>
                      <Progress value={condo.efficiency} className="h-1.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CorporateDashboard;
