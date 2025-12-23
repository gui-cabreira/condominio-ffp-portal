import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Calendar, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChargeData {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  last_contact_at: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  pipeline_stage: string;
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    tower: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    owner_email: string | null;
    tenant_name: string | null;
    tenant_phone: string | null;
    condominium: {
      id: string;
      name: string;
      address: string | null;
    };
  };
  negotiation_history?: {
    id: string;
    status: string;
    proposed_amount: number;
    installments: number;
  }[];
}

interface PipelineCardProps {
  charge: ChargeData;
  onClick: () => void;
}

export function PipelineCard({ charge, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: charge.id,
    data: charge,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const daysOverdue = differenceInDays(new Date(), new Date(charge.due_date));
  const contactName = charge.unit.tenant_name || charge.unit.owner_name || 'Sem nome';
  const contactPhone = charge.unit.tenant_phone || charge.unit.owner_phone;
  const hasAgreement = charge.negotiation_history?.some(n => n.status === 'accepted');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <Card 
        className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 ${
          daysOverdue > 90 ? 'border-l-red-500' :
          daysOverdue > 30 ? 'border-l-orange-500' :
          daysOverdue > 0 ? 'border-l-yellow-500' :
          'border-l-green-500'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header com nome e valor */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {charge.unit.condominium.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-primary">{formatCurrency(charge.amount)}</p>
              {daysOverdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {daysOverdue}d atraso
                </Badge>
              )}
            </div>
          </div>

          {/* Unidade */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>
              Unid. {charge.unit.unit_number}
              {charge.unit.block && ` - Bloco ${charge.unit.block}`}
              {charge.unit.tower && ` - Torre ${charge.unit.tower}`}
            </span>
          </div>

          {/* Contato */}
          {contactPhone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{contactPhone}</span>
            </div>
          )}

          {/* Vencimento */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Venc. {format(new Date(charge.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>

          {/* Último contato */}
          {charge.last_contact_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>Último contato: {format(new Date(charge.last_contact_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
            </div>
          )}

          {/* Próxima ação */}
          {charge.next_action_at && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="h-3 w-3" />
              <span className="truncate">{charge.next_action_description || 'Ação programada'}</span>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {hasAgreement && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                Acordo
              </Badge>
            )}
            {charge.negotiation_history && charge.negotiation_history.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {charge.negotiation_history.length} negociações
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
