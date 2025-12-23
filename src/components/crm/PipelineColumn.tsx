import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PipelineCard } from './PipelineCard';

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

interface Stage {
  id: string;
  name: string;
  display_name: string;
  color: string;
  position: number;
}

interface PipelineColumnProps {
  stage: Stage;
  charges: ChargeData[];
  onCardClick: (charge: ChargeData) => void;
}

export function PipelineColumn({ stage, charges, onCardClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.name,
  });

  const totalAmount = charges.reduce((sum, c) => sum + c.amount, 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[300px] h-full rounded-lg border bg-muted/30 transition-colors ${
        isOver ? 'bg-primary/10 border-primary' : ''
      }`}
    >
      {/* Header da coluna */}
      <div 
        className="p-3 rounded-t-lg border-b"
        style={{ backgroundColor: stage.color + '20' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.display_name}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {charges.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Total: {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {charges.map((charge) => (
            <PipelineCard 
              key={charge.id} 
              charge={charge} 
              onClick={() => onCardClick(charge)}
            />
          ))}
          {charges.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma cobrança
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
