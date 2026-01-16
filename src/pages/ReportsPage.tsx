import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeeklyReports from '@/components/WeeklyReports';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

const ReportsPage = () => {
  const quickReports = [
    { title: 'Relatório de Inadimplência', description: 'Lista completa de inadimplentes', icon: FileText },
    { title: 'Relatório Financeiro Mensal', description: 'Resumo financeiro do mês', icon: TrendingUp },
    { title: 'Relatório de Cobranças', description: 'Cobranças realizadas no período', icon: Calendar },
    { title: 'Relatório de Comunicação', description: 'Efetividade das comunicações', icon: FileText }
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={FileText}
        title="Relatórios"
        description="Gere e visualize relatórios do sistema"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickReports.map((report, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <report.icon className="h-4 w-4" />
                {report.title}
              </CardTitle>
              <CardDescription className="text-sm">{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Relatórios Semanais
          </CardTitle>
          <CardDescription>
            Relatórios automáticos gerados semanalmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyReports />
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default ReportsPage;
