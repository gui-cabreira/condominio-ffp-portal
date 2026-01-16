import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonthlyData, useStatusData, useCommunicationData, useConversionFunnel } from '@/hooks/useDashboardData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Users, CheckCircle } from 'lucide-react';
import { EmailTrackingDashboard } from '@/components/EmailTrackingDashboard';

const AnalyticsPage = () => {
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData();
  const { data: statusData, isLoading: statusLoading } = useStatusData();
  const { data: communicationData, isLoading: commLoading } = useCommunicationData();
  const { data: conversionFunnel, isLoading: funnelLoading } = useConversionFunnel();

  const paymentMethods = [
    { name: 'PIX', value: 45, color: '#10b981' },
    { name: 'Boleto', value: 30, color: '#3b82f6' },
    { name: 'Cartão', value: 15, color: '#8b5cf6' },
    { name: 'Transferência', value: 10, color: '#f59e0b' }
  ];

  const weeklyPerformance = [
    { name: 'Seg', collected: 4000, expected: 5000 },
    { name: 'Ter', collected: 3000, expected: 4500 },
    { name: 'Qua', collected: 5000, expected: 6000 },
    { name: 'Qui', collected: 4500, expected: 5500 },
    { name: 'Sex', collected: 6000, expected: 7000 },
    { name: 'Sáb', collected: 3500, expected: 4000 },
    { name: 'Dom', collected: 2000, expected: 3000 }
  ];

  const isLoading = monthlyLoading || statusLoading || commLoading || funnelLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-7 w-7 md:h-8 md:w-8" />
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Análises detalhadas e métricas de performance</p>
      </div>

      {/* Dashboard de Email Tracking */}
      <EmailTrackingDashboard />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Coleta Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="collected" fill="#10b981" name="Arrecadado" />
                <Bar dataKey="expected" fill="#3b82f6" name="Previsto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="expected" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Esperado" />
                <Area type="monotone" dataKey="collected" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Arrecadado" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Efetividade de Comunicação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={communicationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#3b82f6" name="Enviadas" />
                <Bar dataKey="opened" fill="#10b981" name="Abertas" />
                <Bar dataKey="responded" fill="#8b5cf6" name="Respondidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(conversionFunnel || []).map((stage, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{stage.stage}</span>
                    <span className="text-muted-foreground">{stage.count} ({stage.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all" 
                      style={{ width: `${stage.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
