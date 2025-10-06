import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle, 
  Mail, 
  Eye, 
  DollarSign, 
  Clock, 
  FileText, 
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  metadata: any;
  created_at: string;
  created_by: string | null;
}

interface ChargeTimelineProps {
  chargeId: string;
}

export const ChargeTimeline = ({ chargeId }: ChargeTimelineProps) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['charge-timeline', chargeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_timeline')
        .select('*')
        .eq('charge_id', chargeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TimelineEvent[];
    },
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'sent':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'opened':
        return <Eye className="w-4 h-4 text-green-600" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'request_new':
        return <FileText className="w-4 h-4 text-orange-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-50 border-blue-200';
      case 'sent':
        return 'bg-purple-50 border-purple-200';
      case 'opened':
        return 'bg-green-50 border-green-200';
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'request_new':
        return 'bg-orange-50 border-orange-200';
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getEventTitle = (eventType: string) => {
    const titles: Record<string, string> = {
      created: 'Cobrança Criada',
      sent: 'Mensagem Enviada',
      opened: 'Mensagem Visualizada',
      paid: 'Pagamento Recebido',
      overdue: 'Cobrança Vencida',
      request_new: 'Novo Boleto Solicitado',
      approved: 'Solicitação Aprovada',
      rejected: 'Solicitação Rejeitada',
    };
    return titles[eventType] || eventType;
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando timeline...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Linha vertical */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {events && events.length > 0 ? (
            events.map((event, index) => (
              <div key={event.id} className="relative pl-14">
                {/* Ícone do evento */}
                <div className={`absolute left-0 top-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getEventColor(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>

                {/* Conteúdo do evento */}
                <div className={`p-4 rounded-lg border-2 ${getEventColor(event.event_type)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">
                        {getEventTitle(event.event_type)}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Badge>
                  </div>

                  {/* Metadata adicional */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum evento registrado ainda</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
