import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, MessageSquare, FileText, CheckCircle, Clock, XCircle, Settings } from 'lucide-react';

const AutomationPage = () => {
  const automationStats = [
    { title: 'Automações Ativas', value: '12', icon: Bot, color: 'text-green-600' },
    { title: 'Mensagens Agendadas', value: '48', icon: MessageSquare, color: 'text-blue-600' },
    { title: 'Relatórios Automáticos', value: '5', icon: FileText, color: 'text-purple-600' },
    { title: 'Taxa de Sucesso', value: '94%', icon: CheckCircle, color: 'text-green-600' }
  ];

  const automationLog = [
    { action: 'Envio de cobrança WhatsApp', status: 'success', time: '10:30', count: 15 },
    { action: 'Sincronização de boletos', status: 'success', time: '09:15', count: 42 },
    { action: 'Geração de relatório semanal', status: 'processing', time: '08:00', count: 1 },
    { action: 'Envio de lembretes Email', status: 'success', time: '07:45', count: 28 },
    { action: 'Atualização de status', status: 'failed', time: '06:30', count: 3 }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Falha</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Automação</h1>
        <p className="text-muted-foreground">Gerencie automações e processos do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {automationStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Automação
            </CardTitle>
            <CardDescription>Ative ou desative automações do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-sync" className="flex flex-col gap-1">
                <span>Sincronização Automática de Boletos</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Sincroniza boletos a cada 6 horas
                </span>
              </Label>
              <Switch id="auto-sync" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-messages" className="flex flex-col gap-1">
                <span>Envio Automático de Mensagens</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Envia lembretes de cobrança automaticamente
                </span>
              </Label>
              <Switch id="auto-messages" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reports" className="flex flex-col gap-1">
                <span>Relatórios Semanais</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Gera relatórios toda segunda-feira
                </span>
              </Label>
              <Switch id="auto-reports" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-update" className="flex flex-col gap-1">
                <span>Atualização de Status</span>
                <span className="text-sm text-muted-foreground font-normal">
                  Atualiza status de cobranças diariamente
                </span>
              </Label>
              <Switch id="auto-update" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Templates de Mensagens
            </CardTitle>
            <CardDescription>Personalize templates de comunicação automática</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Template de Cobrança WhatsApp
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Template de Lembrete Email
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Template de Segunda Via
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Template de Confirmação
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log de Atividades Recentes
          </CardTitle>
          <CardDescription>Últimas automações executadas pelo sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationLog.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.time} - {log.count} item(s) processado(s)
                  </p>
                </div>
                {getStatusBadge(log.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationPage;
