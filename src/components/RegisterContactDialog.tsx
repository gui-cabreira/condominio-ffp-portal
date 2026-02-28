import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, User, DollarSign, FileText, ChevronRight, 
  Check, Loader2, Plus, Search, Phone, Mail, Home
} from 'lucide-react';
import { CurrencyInput } from '@/components/forms/CurrencyInput';

interface RegisterContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  phoneNumber: string;
  contactName: string | null;
  onComplete: () => void;
}

interface Condominium {
  id: string;
  name: string;
  address: string | null;
  administrator_id: string | null;
}

interface Unit {
  id: string;
  unit_number: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  condominium_id: string;
}

type Step = 'condominium' | 'unit' | 'charge' | 'done';

const RegisterContactDialog = ({
  open,
  onOpenChange,
  conversationId,
  phoneNumber,
  contactName,
  onComplete
}: RegisterContactDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('condominium');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Condominium
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [condoSearch, setCondoSearch] = useState('');
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);

  // Unit
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [createNewUnit, setCreateNewUnit] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [ownerName, setOwnerName] = useState(contactName || '');
  const [ownerPhone, setOwnerPhone] = useState(phoneNumber || '');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Charge
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState('');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeRefMonth, setChargeRefMonth] = useState('');
  const [skipCharge, setSkipCharge] = useState(false);

  useEffect(() => {
    if (open) {
      loadCondominiums();
      setStep('condominium');
      setSelectedCondo(null);
      setSelectedUnit(null);
      setCreateNewUnit(false);
      setOwnerName(contactName || '');
      setOwnerPhone(phoneNumber || '');
      setSkipCharge(false);
    }
  }, [open]);

  useEffect(() => {
    if (selectedCondo) {
      loadUnits(selectedCondo.id);
    }
  }, [selectedCondo]);

  const loadCondominiums = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('condominiums')
      .select('id, name, address, administrator_id')
      .order('name');
    setCondominiums(data || []);
    setLoading(false);
  };

  const loadUnits = async (condoId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('units')
      .select('id, unit_number, owner_name, owner_phone, owner_email, condominium_id')
      .eq('condominium_id', condoId)
      .order('unit_number');
    setUnits(data || []);
    setLoading(false);
  };

  const handleSelectCondo = (condo: Condominium) => {
    setSelectedCondo(condo);
    setStep('unit');
  };

  const handleSelectUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setOwnerName(unit.owner_name || contactName || '');
    setOwnerPhone(unit.owner_phone || phoneNumber || '');
    setOwnerEmail(unit.owner_email || '');
    setStep('charge');
  };

  const handleCreateUnit = () => {
    setCreateNewUnit(true);
    setSelectedUnit(null);
  };

  const handleSaveAll = async () => {
    if (!selectedCondo) return;

    setSaving(true);
    try {
      let unitId = selectedUnit?.id;

      // Create unit if needed
      if (createNewUnit && newUnitNumber) {
        const { data: newUnit, error: unitError } = await supabase
          .from('units')
          .insert({
            condominium_id: selectedCondo.id,
            unit_number: newUnitNumber,
            owner_name: ownerName || null,
            owner_phone: ownerPhone || null,
            owner_email: ownerEmail || null,
          })
          .select()
          .single();

        if (unitError) throw unitError;
        unitId = newUnit.id;
      } else if (selectedUnit) {
        // Update unit with contact info if changed
        await supabase
          .from('units')
          .update({
            owner_name: ownerName || null,
            owner_phone: ownerPhone || null,
            owner_email: ownerEmail || null,
          })
          .eq('id', selectedUnit.id);
      }

      // Create charge if not skipped
      let chargeId: string | null = null;
      if (!skipCharge && chargeAmount && chargeDueDate && unitId) {
        const amount = parseFloat(chargeAmount.replace(/\./g, '').replace(',', '.'));
        const { data: newCharge, error: chargeError } = await supabase
          .from('charges')
          .insert({
            unit_id: unitId,
            amount,
            due_date: chargeDueDate,
            description: chargeDescription || null,
            reference_month: chargeRefMonth || null,
            status: 'pending',
            pipeline_stage: 'novo',
          })
          .select()
          .single();

        if (chargeError) throw chargeError;
        chargeId = newCharge.id;

        // Add timeline entry
        await supabase
          .from('charge_timeline')
          .insert({
            charge_id: chargeId,
            event_type: 'created',
            event_data: {
              source: 'whatsapp_register',
              conversation_id: conversationId,
              phone: phoneNumber,
            },
          });
      }

      // Link conversation to unit and condominium
      await supabase
        .from('whatsapp_conversations')
        .update({
          unit_id: unitId,
          condominium_id: selectedCondo.id,
          charge_id: chargeId,
          contact_name: ownerName || contactName,
        })
        .eq('id', conversationId);

      setStep('done');
      toast({
        title: 'Cadastro realizado!',
        description: `Contato vinculado a ${selectedCondo.name}${newUnitNumber ? ` - Unidade ${newUnitNumber}` : ''}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        onComplete();
      }, 1500);

    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredCondos = condominiums.filter(c =>
    c.name.toLowerCase().includes(condoSearch.toLowerCase()) ||
    c.address?.toLowerCase().includes(condoSearch.toLowerCase())
  );

  const stepIndex = { condominium: 0, unit: 1, charge: 2, done: 3 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Cadastrar Contato
          </DialogTitle>
          <DialogDescription>
            Vincule {contactName || phoneNumber} a um condomínio e unidade
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-2">
          {['Condomínio', 'Unidade', 'Cobrança'].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                stepIndex[step] > i
                  ? 'bg-primary text-primary-foreground'
                  : stepIndex[step] === i
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {stepIndex[step] > i ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${stepIndex[step] === i ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Select Condominium */}
        {step === 'condominium' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar condomínio..."
                value={condoSearch}
                onChange={(e) => setCondoSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredCondos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum condomínio encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredCondos.map((condo) => (
                  <button
                    key={condo.id}
                    onClick={() => handleSelectCondo(condo)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary/40 transition-all flex items-center gap-3 group"
                  >
                    <Building2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{condo.name}</p>
                      {condo.address && (
                        <p className="text-xs text-muted-foreground truncate">{condo.address}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select or Create Unit */}
        {step === 'unit' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedCondo?.name}</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setStep('condominium')}>
                Alterar
              </Button>
            </div>

            {!createNewUnit ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Selecione a unidade</h4>
                  <Button variant="outline" size="sm" onClick={handleCreateUnit} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Nova Unidade
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : units.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma unidade cadastrada</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleCreateUnit}>
                      <Plus className="h-3 w-3 mr-1" />
                      Criar primeira unidade
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => handleSelectUnit(unit)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary/40 transition-all flex items-center gap-3 group"
                      >
                        <Home className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Unidade {unit.unit_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {unit.owner_name || 'Sem proprietário'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Nova Unidade</h4>
                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs">Número da Unidade *</Label>
                    <Input
                      placeholder="Ex: 101, Bloco A - 301"
                      value={newUnitNumber}
                      onChange={(e) => setNewUnitNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nome do Proprietário/Inquilino</Label>
                    <Input
                      placeholder="Nome completo"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCreateNewUnit(false)}>
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newUnitNumber}
                    onClick={() => setStep('charge')}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Create Charge */}
        {step === 'charge' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span>{selectedCondo?.name}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Home className="h-4 w-4 text-primary" />
              <span>{createNewUnit ? `Unidade ${newUnitNumber}` : `Unidade ${selectedUnit?.unit_number}`}</span>
            </div>

            {/* Contact info for existing unit */}
            {selectedUnit && !createNewUnit && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Contato
                </h4>
                <div className="grid gap-2">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                    </div>
                  </div>
                </div>
                <Separator />
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Dados da Cobrança
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSkipCharge(!skipCharge)}
              >
                {skipCharge ? 'Adicionar cobrança' : 'Pular cobrança'}
              </Button>
            </div>

            {!skipCharge ? (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Valor *</Label>
                    <Input
                      placeholder="0,00"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vencimento *</Label>
                    <Input
                      type="date"
                      value={chargeDueDate}
                      onChange={(e) => setChargeDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Mês Referência</Label>
                    <Input
                      placeholder="Ex: 01/2026"
                      value={chargeRefMonth}
                      onChange={(e) => setChargeRefMonth(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      placeholder="Taxa condominial"
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Apenas vincular contato sem criar cobrança
              </p>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('unit')} disabled={saving}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAll}
                disabled={saving || (!skipCharge && (!chargeAmount || !chargeDueDate))}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {skipCharge ? 'Vincular Contato' : 'Cadastrar Cobrança'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Cadastro Realizado!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Contato vinculado com sucesso
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegisterContactDialog;
