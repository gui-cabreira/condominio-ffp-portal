
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

const CorporateDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Dados mockados para demonstração
  const condominiums = [
    { id: 1, name: 'Condomínio Villa Real', totalUnits: 120, paidUnits: 95, pendingAmount: 'R$ 15.000,00', efficiency: 79 },
    { id: 2, name: 'Residencial Jardins', totalUnits: 80, paidUnits: 75, pendingAmount: 'R$ 8.500,00', efficiency: 94 },
    { id: 3, name: 'Edifício Central Park', totalUnits: 200, paidUnits: 150, pendingAmount: 'R$ 22.000,00', efficiency: 75 },
    { id: 4, name: 'Condomínio Sunset', totalUnits: 60, paidUnits: 50, pendingAmount: 'R$ 12.300,00', efficiency: 83 },
  ];

  // Dados para gráficos
  const monthlyData = [
    { month: 'Jan', collected: 45000, expected: 50000 },
    { month: 'Fev', collected: 52000, expected: 55000 },
    { month: 'Mar', collected: 48000, expected: 52000 },
    { month: 'Abr', collected: 61000, expected: 60000 },
    { month: 'Mai', collected: 55000, expected: 58000 },
    { month: 'Jun', collected: 67000, expected: 65000 },
  ];

  const statusData = [
    { name: 'Pago', value: 65, color: '#22c55e' },
    { name: 'Pendente', value: 25, color: '#f59e0b' },
    { name: 'Vencido', value: 10, color: '#ef4444' },
  ];

  const communicationData = [
    { method: 'WhatsApp', sent: 1200, opened: 980, responded: 750 },
    { method: 'E-mail', sent: 800, opened: 420, responded: 180 },
    { method: 'SMS', sent: 400, opened: 350, responded: 120 },
  ];

  // Novos dados para gráficos adicionais
  const resolutionTimeData = [
    { range: '0-3 dias', count: 45, percentage: 35 },
    { range: '4-7 dias', count: 38, percentage: 30 },
    { range: '8-15 dias', count: 25, percentage: 20 },
    { range: '16-30 dias', count: 12, percentage: 10 },
    { range: '30+ dias', count: 6, percentage: 5 },
  ];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago': return 'text-green-600 bg-green-100';
      case 'Pendente': return 'text-yellow-600 bg-yellow-100';
      case 'Vencido': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-semibold text-ffp-navy">Sistema Corporativo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Bem-vindo, Admin</span>
              <Link to="/portal" className="text-ffp-navy hover:text-ffp-gold">
                <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Cobrança</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">R$ 57.800,00</div>
              <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Condomínios Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">{condominiums.length}</div>
              <p className="text-xs text-muted-foreground">460 unidades totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">82%</div>
              <p className="text-xs text-muted-foreground">+5% este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automação</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">98%</div>
              <p className="text-xs text-muted-foreground">Boletos sincronizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">7,2 dias</div>
              <p className="text-xs text-muted-foreground">Para resolução</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="condominiums" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="condominiums">Condomínios</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="automation">Automação</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Link to="/portal/corporativo/importar">
                <Button variant="outline" className="flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Cobranças
                </Button>
              </Link>
              <Link to="/portal/corporativo/cadastrar-inadimplente">
                <Button variant="outline" className="flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar Inadimplente
                </Button>
              </Link>
              <Button variant="outline" className="flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Sync Boletos
              </Button>
              <Link to="/portal/corporativo/workflow">
                <Button variant="outline" className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Config. Workflow
                </Button>
              </Link>
              <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                <Plus className="w-4 h-4 mr-2" />
                Novo Condomínio
              </Button>
            </div>
          </div>

          <TabsContent value="condominiums">
            <Card>
              <CardHeader>
                <CardTitle className="text-ffp-navy">Gestão de Condomínios</CardTitle>
                <CardDescription>Controle e organização de todos os condomínios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar condomínio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                </div>

                <div className="grid gap-4">
                  {condominiums.map((condo) => (
                    <Card key={condo.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg text-ffp-navy">{condo.name}</h3>
                            <p className="text-gray-600">{condo.totalUnits} unidades</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-ffp-navy">{condo.pendingAmount}</p>
                            <p className="text-sm text-gray-500">em cobrança</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Taxa de Pagamento</span>
                            <span className="text-sm font-medium">{condo.efficiency}%</span>
                          </div>
                          <Progress value={condo.efficiency} className="h-2" />
                          
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{condo.paidUnits} pagas</span>
                            <span>{condo.totalUnits - condo.paidUnits} pendentes</span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Link to={`/portal/corporativo/condominio/${condo.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">Ver Detalhes</Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Gráfico de Arrecadação */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Arrecadação Mensal</CardTitle>
                  <CardDescription>Valores arrecadados vs esperados</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
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

              {/* Gráfico de Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Status dos Pagamentos</CardTitle>
                  <CardDescription>Distribuição atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tempo de Resolução */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Tempo de Resolução</CardTitle>
                  <CardDescription>Distribuição dos dias para pagamento</CardDescription>
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
                  <CardDescription>Preferência dos clientes</CardDescription>
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

              {/* Performance Semanal */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Performance Semanal</CardTitle>
                  <CardDescription>Evolução dos resultados por semana</CardDescription>
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
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <div className="space-y-6">
              {/* Status da Automação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Configurações de Automação */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-ffp-navy">Sincronização de Boletos</CardTitle>
                    <CardDescription>Configure a atualização automática dos boletos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sincronização Automática</span>
                      <Button variant="outline" size="sm">Ativado</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Frequência</span>
                      <span className="text-sm text-gray-600">A cada 4 horas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Última sincronização</span>
                      <span className="text-sm text-gray-600">Há 2 horas</span>
                    </div>
                    <Button className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar Agora
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-ffp-navy">Templates de Mensagem</CardTitle>
                    <CardDescription>Geração automática de templates personalizados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">WhatsApp - 1º Contato</Label>
                      <div className="p-3 bg-gray-50 rounded text-sm">
                        "Olá {'nome'}, seu boleto de {'valor'} vence em {'dias_vencimento'} dias. Clique aqui para visualizar: {'link_boleto'}"
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">E-mail - Lembrete</Label>
                      <div className="p-3 bg-gray-50 rounded text-sm">
                        "Prezado(a) {'nome'}, este é um lembrete amigável sobre seu boleto de {'valor'}..."
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Editar Templates
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Logs de Automação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Logs de Automação</CardTitle>
                  <CardDescription>Histórico das operações automáticas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: '14:30', action: 'Sincronização de boletos', status: 'success', details: '450 boletos atualizados' },
                      { time: '12:15', action: 'Envio automático WhatsApp', status: 'success', details: '120 mensagens enviadas' },
                      { time: '10:00', action: 'Geração de templates', status: 'success', details: '3 templates atualizados' },
                      { time: '09:45', action: 'Sincronização de boletos', status: 'warning', details: '12 boletos com erro' },
                    ].map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-gray-600">{log.details}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle className="text-ffp-navy">Configuração do Workflow</CardTitle>
                <CardDescription>Configure os fluxos de cobrança automatizada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Configure seu Workflow de Cobrança
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Crie e personalize os fluxos automáticos de cobrança com textos e timing personalizados
                  </p>
                  <Link to="/portal/corporativo/workflow">
                    <Button className="bg-ffp-navy hover:bg-ffp-navy-dark text-white">
                      Acessar Configuração
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

export default CorporateDashboard;
