import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { PipelineColumn } from '@/components/crm/PipelineColumn';
import { ChargeDetailSheet } from '@/components/crm/ChargeDetailSheet';
import { PipelineCard } from '@/components/crm/PipelineCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Stage {
  id: string;
  name: string;
  display_name: string;
  color: string;
  position: number;
}

interface ChargeData {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  last_contact_at: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  pipeline_stage: string;
  principal_amount?: number;
  interest_amount?: number;
  fine_amount?: number;
  attorney_fees?: number;
  description?: string;
  reference_month?: string;
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
    tenant_email: string | null;
    owner_street: string | null;
    owner_city: string | null;
    owner_state: string | null;
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
    original_amount: number;
    installments: number;
    proposed_at: string;
    notes: string | null;
  }[];
}

export default function CRMPipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [charges, setCharges] = useState<ChargeData[]>([]);
  const [condominiums, setCondominiums] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondominium, setSelectedCondominium] = useState<string>('all');
  const [selectedCharge, setSelectedCharge] = useState<ChargeData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar estágios
      const { data: stagesData, error: stagesError } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .order('position');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Carregar condomínios
      const { data: condosData } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');
      setCondominiums(condosData || []);

      // Carregar cobranças com dados relacionados
      const { data: chargesData, error: chargesError } = await supabase
        .from('charges')
        .select(`
          id,
          amount,
          due_date,
          status,
          last_contact_at,
          next_action_at,
          next_action_description,
          pipeline_stage,
          principal_amount,
          interest_amount,
          fine_amount,
          attorney_fees,
          description,
          reference_month,
          unit:units!inner (
            id,
            unit_number,
            block,
            tower,
            owner_name,
            owner_phone,
            owner_email,
            tenant_name,
            tenant_phone,
            tenant_email,
            owner_street,
            owner_city,
            owner_state,
            condominium:condominiums!inner (
              id,
              name,
              address
            )
          )
        `)
        .neq('status', 'paid')
        .order('due_date', { ascending: true });

      if (chargesError) throw chargesError;

      // Carregar histórico de negociações
      const chargeIds = chargesData?.map(c => c.id) || [];
      let negotiations: any[] = [];
      if (chargeIds.length > 0) {
        const { data: negsData } = await supabase
          .from('negotiation_history')
          .select('*')
          .in('charge_id', chargeIds)
          .order('proposed_at', { ascending: false });
        negotiations = negsData || [];
      }

      // Mapear cobranças com negociações
      const chargesWithNeg = chargesData?.map(charge => ({
        ...charge,
        pipeline_stage: charge.pipeline_stage || 'novo',
        unit: Array.isArray(charge.unit) ? charge.unit[0] : charge.unit,
        negotiation_history: negotiations.filter(n => n.charge_id === charge.id)
      })) || [];

      setCharges(chargesWithNeg as ChargeData[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do CRM');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const chargeId = active.id as string;
    const newStage = over.id as string;

    // Atualizar localmente primeiro
    setCharges(prev => 
      prev.map(c => c.id === chargeId ? { ...c, pipeline_stage: newStage } : c)
    );

    // Atualizar no banco
    try {
      const { error } = await supabase
        .from('charges')
        .update({ pipeline_stage: newStage })
        .eq('id', chargeId);

      if (error) throw error;

      // Registrar no timeline
      await supabase.from('charge_timeline').insert({
        charge_id: chargeId,
        event_type: 'stage_change',
        event_data: { new_stage: newStage }
      });

      toast.success('Etapa atualizada');
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast.error('Erro ao atualizar etapa');
      loadData(); // Recarregar em caso de erro
    }
  };

  const handleCardClick = (charge: ChargeData) => {
    setSelectedCharge(charge);
    setSheetOpen(true);
  };

  const handleSendNotification = async (chargeId: string, channel: 'email' | 'whatsapp') => {
    try {
      const { error } = await supabase.functions.invoke('send-charge-notification', {
        body: { chargeId, channel }
      });

      if (error) throw error;
      toast.success(`Notificação enviada via ${channel === 'email' ? 'Email' : 'WhatsApp'}`);
      
      // Atualizar last_contact_at
      await supabase
        .from('charges')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', chargeId);

      loadData();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
    }
  };

  // Filtrar cobranças
  const filteredCharges = charges.filter(charge => {
    const matchesSearch = searchTerm === '' || 
      charge.unit.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.unit.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.unit.condominium.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.unit.unit_number.includes(searchTerm);

    const matchesCondo = selectedCondominium === 'all' || 
      charge.unit.condominium.id === selectedCondominium;

    return matchesSearch && matchesCondo;
  });

  // Agrupar por estágio
  const chargesByStage = stages.reduce((acc, stage) => {
    acc[stage.name] = filteredCharges.filter(c => c.pipeline_stage === stage.name);
    return acc;
  }, {} as Record<string, ChargeData[]>);

  const activeCharge = activeId ? charges.find(c => c.id === activeId) : null;

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="CRM Pipeline"
        description="Funil de cobrança - arraste os cards para mudar o estágio"
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 px-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, condomínio, unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Condomínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os condomínios</SelectItem>
            {condominiums.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="h-full w-full">
            <div className="flex gap-4 p-1 h-[calc(100vh-280px)] min-w-max">
              {stages.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  charges={chargesByStage[stage.name] || []}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <DragOverlay>
            {activeCharge ? (
              <PipelineCard charge={activeCharge} onClick={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Sheet de detalhes */}
      <ChargeDetailSheet
        charge={selectedCharge}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSendNotification={handleSendNotification}
        onChargeUpdated={loadData}
      />
    </div>
  );
}
