import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, DollarSign, Users, Calendar, Search, Plus, Filter, Building2, Settings, BarChart3, TrendingUp, AlertTriangle, Clock, RefreshCw, Zap, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import StatisticsAgent from '@/components/StatisticsAgent';
import WeeklyReports from '@/components/WeeklyReports';
import { useDashboardStats, useCondominiums, useMonthlyData, useStatusData, useCommunicationData } from '@/hooks/useDashboardData';

const CorporateDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Buscar dados reais
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: condominiums, isLoading: condosLoading } = useCondominiums();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData();
  const { data: statusData, isLoading: statusLoading } = useStatusData();
  const { data: communicationData, isLoading: commLoading } = useCommunicationData();

  // Dados estáticos temporários para gráficos adicionais
  const paymentMethodsData = [
    { method: 'PIX', value: 45, color: '#22c55e' },
    { method: 'Boleto', value: 35, color: '#3b82f6' },
    { method: 'Cartão', value: 15, color: '#f59e0b' },
    { method: 'Transferência', value: 5, color: '#8b5cf6' },
  ];

  const weeklyPerformanceData = [
    { week: 'Sem 1', enviados: 280, respondidos: 180, pagos: 120 },
    { week: 'Sem 2', enviados: 320, respondidos: 210, pagos: 150 },
    { week: 'Sem 3', enviados: 290, respondidos: 195, pagos: 135 },
    { week: 'Sem 4', enviados: 350, respondidos: 240, pagos: 180 },
  ];

  const conversionFunnelData = [
    { stage: 'Enviado', count: 1000, percentage: 100 },
    { stage: 'Aberto', count: 750, percentage: 75 },
    { stage: 'Clicado', count: 450, percentage: 45 },
    { stage: 'Visualizado', count: 300, percentage: 30 },
    { stage: 'Pago', count: 180, percentage: 18 },
  ];

  const automationStatusData = [
    { name: 'Boletos Atualizados', count: 450, status: 'success' },
    { name: 'Pendentes Sync', count: 12, status: 'warning' },
    { name: 'Falhas', count: 3, status: 'error' },
  ];

  const resolutionTimeData = [
    { range: '0-3 dias', count: 45, percentage: 35 },
    { range: '4-7 dias', count: 38, percentage: 30 },
    { range: '8-15 dias', count: 25, percentage: 20 },
    { range: '16-30 dias', count: 12, percentage: 10 },
    { range: '30+ dias', count: 6, percentage: 5 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago': return 'text-green-600 bg-green-100';
      case 'Pendente': return 'text-yellow-600 bg-yellow-100';
      case 'Vencido': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isLoading = statsLoading || condosLoading || monthlyLoading || statusLoading || commLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header com Ações */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ffp-navy">Dashboard Corporativo</h1>
            <p className="text-muted-foreground">Visão completa da operação</p>
          </div>
          <div className="flex gap-2">
            <Link to="/portal/corporativo/condominios">
              <Button variant="outline" className="flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                Condomínios
              </Button>
            </Link>
            <Link to="/portal/corporativo/cobrancas">
              <Button variant="outline" className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Cobranças
              </Button>
            </Link>
            <Link to="/portal/corporativo/backoffice">
              <Button variant="outline" className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Backoffice
              </Button>
            </Link>
            <Link to="/portal/corporativo/usuarios">
              <Button variant="outline" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Usuários
              </Button>
            </Link>
            <Link to="/portal/corporativo/workflow">
              <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Cobrança</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">
                R$ {stats?.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Valores pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Condomínios</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">{stats?.condominiumsCount}</div>
              <p className="text-xs text-muted-foreground">{stats?.unitsCount} unidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">{stats?.successRate}%</div>
              <p className="text-xs text-muted-foreground">Cobranças pagas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automação</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">{stats?.automationRate}%</div>
              <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">{stats?.avgResolutionDays} dias</div>
              <p className="text-xs text-muted-foreground">Para resolução</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Arrecadação Mensal */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-ffp-navy">Arrecadação Mensal</CardTitle>
              <CardDescription>Valores arrecadados vs esperados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${value.toLocaleString()}`, '']} />
                  <Bar dataKey="expected" fill="#ddd" name="Esperado" />
                  <Bar dataKey="collected" fill="#1f2937" name="Arrecadado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status dos Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-ffp-navy">Status dos Pagamentos</CardTitle>
              <CardDescription>Distribuição atual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {(statusData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Semanal */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-ffp-navy">Performance Semanal</CardTitle>
              <CardDescription>Evolução dos resultados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="enviados" stackId="1" stroke="#ddd" fill="#ddd" name="Enviados" />
                  <Area type="monotone" dataKey="respondidos" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Respondidos" />
                  <Area type="monotone" dataKey="pagos" stackId="1" stroke="#22c55e" fill="#22c55e" name="Pagos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funil de Conversão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-ffp-navy">Funil de Conversão</CardTitle>
              <CardDescription>Jornada do cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversionFunnelData.map((stage, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-gray-600">{stage.count} ({stage.percentage}%)</span>
                    </div>
                    <Progress value={stage.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Eficácia da Comunicação */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-ffp-navy">Eficácia da Comunicação</CardTitle>
              <CardDescription>Performance dos canais de cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={communicationData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="method" type="category" />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#ddd" name="Enviado" />
                  <Bar dataKey="opened" fill="#f59e0b" name="Aberto" />
                  <Bar dataKey="responded" fill="#22c55e" name="Respondido" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tempo de Resolução */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-ffp-navy">Tempo de Resolução</CardTitle>
              <CardDescription>Dias até o pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={resolutionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="count" fill="#1f2937" name="Quantidade" />
                  <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#f59e0b" strokeWidth={2} name="%" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Métodos de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-ffp-navy">Métodos de Pagamento</CardTitle>
              <CardDescription>Preferências</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status da Automação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {automationStatusData.map((item, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                <div className={`w-3 h-3 rounded-full ${
                  item.status === 'success' ? 'bg-green-500' : 
                  item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-ffp-navy">{item.count}</div>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Condomínios em Destaque */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-ffp-navy">Condomínios em Destaque</CardTitle>
                <CardDescription>Últimos condomínios cadastrados ou com atividade</CardDescription>
              </div>
              <Link to="/portal/corporativo/condominios">
                <Button variant="outline">
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(condominiums || []).slice(0, 6).map((condo) => (
                <Card key={condo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-ffp-navy">{condo.name}</h3>
                        <p className="text-sm text-gray-600">{condo.totalUnits} unidades</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ffp-navy">{condo.pendingAmount}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Pagamento</span>
                        <span className="text-xs font-medium">{condo.efficiency}%</span>
                      </div>
                      <Progress value={condo.efficiency} className="h-1.5" />
                    </div>

                    <Link to={`/portal/corporativo/condominio/${condo.id}`} className="block mt-3">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Relatórios Semanais */}
        <WeeklyReports />

      </div>

      {/* Statistics Agent */}
      <StatisticsAgent />
    </div>
  );
};

export default CorporateDashboard;
