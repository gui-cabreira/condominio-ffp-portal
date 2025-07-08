
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, DollarSign, Users, Calendar, Search, Plus, Filter, Building2, Settings, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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
              <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ffp-navy">18%</div>
              <p className="text-xs text-muted-foreground">-2% este mês</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="condominiums" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="condominiums">Condomínios</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Arrecadação */}
              <Card>
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
                  <CardDescription>Distribuição atual dos pagamentos</CardDescription>
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

              {/* Eficácia da Comunicação */}
              <Card>
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

              {/* Tendência de Inadimplência */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Tendência de Inadimplência</CardTitle>
                  <CardDescription>Evolução da inadimplência nos últimos meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="collected" 
                        stroke="#1f2937" 
                        strokeWidth={2}
                        name="Arrecadação"
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
