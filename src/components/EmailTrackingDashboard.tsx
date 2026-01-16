import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MailOpen, MousePointer, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EmailMetrics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export function EmailTrackingDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['email-tracking-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_tracking')
        .select('sent_at, delivered_at, opened_at, clicked_at, bounced_at');

      if (error) throw error;

      const result: EmailMetrics = {
        total: data?.length || 0,
        sent: data?.filter(e => e.sent_at).length || 0,
        delivered: data?.filter(e => e.delivered_at).length || 0,
        opened: data?.filter(e => e.opened_at).length || 0,
        clicked: data?.filter(e => e.clicked_at).length || 0,
        bounced: data?.filter(e => e.bounced_at).length || 0,
      };

      return result;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Carregando métricas...</div>
        </CardContent>
      </Card>
    );
  }

  const openRate = metrics?.delivered ? ((metrics.opened / metrics.delivered) * 100).toFixed(1) : '0';
  const clickRate = metrics?.opened ? ((metrics.clicked / metrics.opened) * 100).toFixed(1) : '0';
  const deliveryRate = metrics?.sent ? ((metrics.delivered / metrics.sent) * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Métricas de Email
        </CardTitle>
        <CardDescription>
          Acompanhamento de emails enviados pelo sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            icon={<Send className="h-4 w-4" />}
            label="Enviados"
            value={metrics?.sent || 0}
            color="text-blue-500"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Entregues"
            value={metrics?.delivered || 0}
            color="text-green-500"
            subtext={`${deliveryRate}%`}
          />
          <MetricCard
            icon={<MailOpen className="h-4 w-4" />}
            label="Abertos"
            value={metrics?.opened || 0}
            color="text-purple-500"
            subtext={`${openRate}%`}
          />
          <MetricCard
            icon={<MousePointer className="h-4 w-4" />}
            label="Clicados"
            value={metrics?.clicked || 0}
            color="text-orange-500"
            subtext={`${clickRate}%`}
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Rejeitados"
            value={metrics?.bounced || 0}
            color="text-red-500"
          />
          <div className="flex flex-col justify-center p-3 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground mb-1">Taxa de Abertura</span>
            <Progress value={parseFloat(openRate)} className="h-2" />
            <span className="text-lg font-bold mt-1">{openRate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  subtext?: string;
}

function MetricCard({ icon, label, value, color, subtext }: MetricCardProps) {
  return (
    <div className="flex flex-col p-3 bg-muted rounded-lg">
      <div className={`flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
      {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
    </div>
  );
}
