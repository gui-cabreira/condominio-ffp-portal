import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Upload, DollarSign, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { CPFInput } from '@/components/forms/CPFInput';
import { AddressForm, AddressData } from '@/components/forms/AddressForm';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/forms/CurrencyInput';

interface NewChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administrators: any[];
  condominiums: any[];
  units: any[];
  onSuccess: () => void;
}

interface NewUnitData {
  unit_number: string;
  owner_name: string;
  owner_cpf: string;
  owner_email: string;
  owner_phone: string;
  owner_street: string;
  owner_number: string;
  owner_complement: string;
  owner_neighborhood: string;
  owner_city: string;
  owner_state: string;
  owner_zip_code: string;
}

export function NewChargeDialog({ 
  open, 
  onOpenChange, 
  administrators, 
  condominiums, 
  units,
  onSuccess 
}: NewChargeDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedAdministrator, setSelectedAdministrator] = useState('');
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [newUnit, setNewUnit] = useState<NewUnitData>({
    unit_number: '',
    owner_name: '',
    owner_cpf: '',
    owner_email: '',
    owner_phone: '',
    owner_street: '',
    owner_number: '',
    owner_complement: '',
    owner_neighborhood: '',
    owner_city: '',
    owner_state: '',
    owner_zip_code: '',
  });
  const [chargeData, setChargeData] = useState({
    amount: 0,
    due_date: '',
    reference_month: '',
    description: '',
  });
  const [autoNotify, setAutoNotify] = useState(true);
  const [enableFees, setEnableFees] = useState(false);
  const [feesRate, setFeesRate] = useState(10);
  const [interestRate, setInterestRate] = useState(2);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const calculatedFees = useMemo(() => {
    if (!enableFees || !chargeData.amount) return { fees: 0, interest: 0, total: chargeData.amount };
    const fees = chargeData.amount * (feesRate / 100);
    const interest = chargeData.amount * (interestRate / 100);
    const total = chargeData.amount + fees + interest;
    return { fees, interest, total };
  }, [chargeData.amount, enableFees, feesRate, interestRate]);

  const filteredCondominiums = selectedAdministrator
    ? condominiums.filter(c => c.administrator_id === selectedAdministrator)
    : [];

  const filteredUnits = selectedCondominium
    ? units.filter(u => u.condominium_id === selectedCondominium)
    : [];

  const handleNext = () => {
    if (step === 1 && !selectedAdministrator) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma administradora',
        variant: 'destructive',
      });
      return;
    }
    if (step === 2 && !selectedCondominium) {
      toast({
        title: 'Atenção',
        description: 'Selecione um condomínio',
        variant: 'destructive',
      });
      return;
    }
    if (step === 3 && !selectedUnit && !showNewUnit) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma unidade ou cadastre uma nova',
        variant: 'destructive',
      });
      return;
    }
    if (step === 3 && showNewUnit && (!newUnit.unit_number || !newUnit.owner_name || !newUnit.owner_cpf || !newUnit.owner_phone)) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os dados obrigatórios: Unidade, Nome, CPF e Telefone',
        variant: 'destructive',
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (showNewUnit) {
      setShowNewUnit(false);
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      let unitId = selectedUnit;

      // Se está cadastrando nova unidade
      if (showNewUnit) {
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .insert([{
            condominium_id: selectedCondominium,
            unit_number: newUnit.unit_number,
            owner_name: newUnit.owner_name,
            owner_cpf: newUnit.owner_cpf,
            owner_email: newUnit.owner_email,
            owner_phone: newUnit.owner_phone,
            owner_street: newUnit.owner_street,
            owner_number: newUnit.owner_number,
            owner_complement: newUnit.owner_complement,
            owner_neighborhood: newUnit.owner_neighborhood,
            owner_city: newUnit.owner_city,
            owner_state: newUnit.owner_state,
            owner_zip_code: newUnit.owner_zip_code,
          }])
          .select()
          .single();

        if (unitError) throw unitError;
        unitId = unitData.id;
      }

      // Criar cobrança
      const finalAmount = enableFees ? calculatedFees.total : chargeData.amount;
      const { data: chargeResult, error: chargeError } = await supabase
        .from('charges')
        .insert([{
          unit_id: unitId,
          amount: chargeData.amount,
          due_date: chargeData.due_date,
          reference_month: chargeData.reference_month || null,
          description: chargeData.description || null,
          administrator_id: selectedAdministrator,
          workflow_id: selectedWorkflow || null,
          fees_rate: enableFees ? feesRate : null,
          interest_rate: enableFees ? interestRate : null,
          fine_amount: enableFees ? calculatedFees.fees : null,
          interest_amount: enableFees ? calculatedFees.interest : null,
          total_with_fees: enableFees ? finalAmount : null,
        }])
        .select()
        .single();

      if (chargeError) throw chargeError;

      // Upload do boleto se houver
      if (boletoFile && chargeResult) {
        const fileExt = boletoFile.name.split('.').pop();
        const fileName = `${chargeResult.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('boletos')
          .upload(fileName, boletoFile);

        if (uploadError) {
          console.error('Error uploading boleto:', uploadError);
          toast({
            title: 'Aviso',
            description: 'Cobrança criada, mas erro ao enviar boleto',
            variant: 'default',
          });
        }
      }

      // Disparar notificação automática se habilitado
      if (autoNotify && chargeResult) {
        try {
          console.log('Sending auto notification for charge:', chargeResult.id);
          const { error: notifyError } = await supabase.functions.invoke('auto-charge-notification', {
            body: {
              chargeId: chargeResult.id,
              sendEmail: true,
              sendWhatsApp: true
            }
          });

          if (notifyError) {
            console.error('Notification error:', notifyError);
            toast({
              title: 'Aviso',
              description: 'Cobrança criada, mas houve erro ao enviar notificações',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Sucesso',
              description: 'Cobrança cadastrada e notificações enviadas!',
            });
          }
        } catch (notifyError) {
          console.error('Notification error:', notifyError);
        }
      } else {
        toast({
          title: 'Sucesso',
          description: 'Cobrança cadastrada com sucesso',
        });
      }

      // Reset do formulário
      setStep(1);
      setSelectedAdministrator('');
      setSelectedCondominium('');
      setSelectedUnit('');
      setSelectedWorkflow('');
      setShowNewUnit(false);
      setNewUnit({
        unit_number: '',
        owner_name: '',
        owner_cpf: '',
        owner_email: '',
        owner_phone: '',
        owner_street: '',
        owner_number: '',
        owner_complement: '',
        owner_neighborhood: '',
        owner_city: '',
        owner_state: '',
        owner_zip_code: '',
      });
      setChargeData({ amount: 0, due_date: '', reference_month: '', description: '' });
      setBoletoFile(null);
      setEnableFees(false);
      setFeesRate(10);
      setInterestRate(2);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating charge:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar cobrança',
        variant: 'destructive',
      });
    }
  };

  const getSelectedAdministratorName = () => 
    administrators.find(a => a.id === selectedAdministrator)?.name || '';
  
  const getSelectedCondominiumName = () => 
    condominiums.find(c => c.id === selectedCondominium)?.name || '';
  
  const getSelectedUnitInfo = () => {
    if (showNewUnit) {
      return `Nova Unidade: ${newUnit.unit_number} - ${newUnit.owner_name}`;
    }
    const unit = units.find(u => u.id === selectedUnit);
    return unit ? `Unidade ${unit.unit_number} - ${unit.owner_name}` : '';
  };

  const handleAddressChange = (address: AddressData) => {
    setNewUnit({
      ...newUnit,
      owner_street: address.street,
      owner_number: address.number,
      owner_complement: address.complement,
      owner_neighborhood: address.neighborhood,
      owner_city: address.city,
      owner_state: address.state,
      owner_zip_code: address.cep,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Nova Cobrança - Etapa {step} de 4</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Selecione a administradora'}
            {step === 2 && 'Selecione o condomínio'}
            {step === 3 && !showNewUnit && 'Selecione ou cadastre uma unidade'}
            {step === 3 && showNewUnit && 'Cadastre os dados completos do proprietário'}
            {step === 4 && 'Revise os dados e finalize a cobrança'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)] px-6">
          <div className="space-y-4 pb-6">
          {/* Etapa 1: Administradora */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Administradora *</Label>
              <div className="grid grid-cols-1 gap-3">
                {administrators.map((admin) => (
                  <Card
                    key={admin.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedAdministrator === admin.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedAdministrator(admin.id)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{admin.name}</div>
                      <div className="text-sm text-muted-foreground">{admin.cnpj}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 2: Condomínio */}
          {step === 2 && (
            <div className="space-y-4">
              <Label>Condomínio *</Label>
              <div className="grid grid-cols-1 gap-3">
                {filteredCondominiums.map((condo) => (
                  <Card
                    key={condo.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedCondominium === condo.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedCondominium(condo.id)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{condo.name}</div>
                      <div className="text-sm text-muted-foreground">{condo.address}</div>
                      <div className="text-sm text-muted-foreground">{condo.total_units} unidades</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3: Unidade */}
          {step === 3 && !showNewUnit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Unidade *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewUnit(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Nova Unidade
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {filteredUnits.map((unit) => (
                  <Card
                    key={unit.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedUnit === unit.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedUnit(unit.id)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">Unidade {unit.unit_number}</div>
                      <div className="text-sm text-muted-foreground">{unit.owner_name}</div>
                      {unit.owner_email && (
                        <div className="text-sm text-muted-foreground">{unit.owner_email}</div>
                      )}
                      {unit.owner_phone && (
                        <div className="text-sm text-muted-foreground">{unit.owner_phone}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3: Cadastrar Nova Unidade */}
          {step === 3 && showNewUnit && (
             <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dados da Unidade</h3>
                
                <div>
                  <Label htmlFor="unit_number">Número da Unidade *</Label>
                  <Input
                    id="unit_number"
                    value={newUnit.unit_number}
                    onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
                    placeholder="Ex: 101, 202, Bloco A Apt 301"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dados do Proprietário</h3>
                
                <div>
                  <Label htmlFor="owner_name">Nome Completo *</Label>
                  <Input
                    id="owner_name"
                    value={newUnit.owner_name}
                    onChange={(e) => setNewUnit({ ...newUnit, owner_name: e.target.value })}
                    placeholder="Nome completo do proprietário"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="owner_cpf">CPF *</Label>
                  <CPFInput
                    id="owner_cpf"
                    value={newUnit.owner_cpf}
                    onChange={(val) => setNewUnit({ ...newUnit, owner_cpf: val })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="owner_phone">Telefone *</Label>
                  <PhoneInput
                    id="owner_phone"
                    value={newUnit.owner_phone}
                    onChange={(val) => setNewUnit({ ...newUnit, owner_phone: val })}
                    showIcon={true}
                  />
                </div>

                <div>
                  <Label htmlFor="owner_email">Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={newUnit.owner_email}
                    onChange={(e) => setNewUnit({ ...newUnit, owner_email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Endereço do Proprietário</h3>
                <AddressForm
                  value={{
                    cep: newUnit.owner_zip_code,
                    street: newUnit.owner_street,
                    number: newUnit.owner_number,
                    complement: newUnit.owner_complement,
                    neighborhood: newUnit.owner_neighborhood,
                    city: newUnit.owner_city,
                    state: newUnit.owner_state,
                  }}
                  onChange={handleAddressChange}
                />
              </div>
            </div>
          )}

          {/* Etapa 4: Dados da Cobrança */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Resumo da seleção */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><span className="font-medium">Administradora:</span> {getSelectedAdministratorName()}</div>
                  <div><span className="font-medium">Condomínio:</span> {getSelectedCondominiumName()}</div>
                  <div><span className="font-medium">Unidade:</span> {getSelectedUnitInfo()}</div>
                </CardContent>
              </Card>

              {/* Anexar Boleto */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Anexar Boleto / Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    id="boleto_upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setBoletoFile(e.target.files?.[0] || null)}
                  />
                  {boletoFile && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md mt-2 text-sm">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>{boletoFile.name}</span>
                      <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setBoletoFile(null)}>
                        Remover
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Aceita PDF, JPG ou PNG
                  </p>
                </CardContent>
              </Card>

              {/* Valor da Cobrança */}
              <div>
                <Label htmlFor="amount">Valor Principal *</Label>
                <CurrencyInput
                  id="amount"
                  value={chargeData.amount}
                  onValueChange={(val) => setChargeData({ ...chargeData, amount: val })}
                  showIcon
                />
              </div>

              {/* Cálculos Adicionais */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Cálculos Adicionais</Label>
                  <p className="text-xs text-muted-foreground">Incluir honorários e juros</p>
                </div>
                <Switch checked={enableFees} onCheckedChange={setEnableFees} />
              </div>

              {enableFees && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fees_rate">Honorários (%)</Label>
                      <Input
                        id="fees_rate"
                        type="number"
                        value={feesRate}
                        onChange={(e) => setFeesRate(parseFloat(e.target.value) || 0)}
                        min="0" max="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interest_rate">Juros ao Mês (%)</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                        min="0" max="100"
                      />
                    </div>
                  </div>

                  <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Cálculo Automático</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Valor Principal:</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(chargeData.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Honorários ({feesRate}%):</span>
                        <span className="text-orange-600">+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedFees.fees)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Juros ({interestRate}%):</span>
                        <span className="text-orange-600">+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedFees.interest)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold text-primary">
                        <span>Valor Total:</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedFees.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div>
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={chargeData.due_date}
                  onChange={(e) => setChargeData({ ...chargeData, due_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reference_month">Mês de Referência</Label>
                <Input
                  id="reference_month"
                  type="month"
                  value={chargeData.reference_month}
                  onChange={(e) => setChargeData({ ...chargeData, reference_month: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={chargeData.description}
                  onChange={(e) => setChargeData({ ...chargeData, description: e.target.value })}
                  placeholder="Descrição da cobrança"
                />
              </div>

              <div>
                <Label>Workflow de Cobrança</Label>
                <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um workflow (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O workflow define as etapas automáticas de cobrança
                </p>
              </div>

              {/* Auto notificação */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notificar automaticamente</Label>
                  <p className="text-xs text-muted-foreground">Enviar email e WhatsApp ao devedor</p>
                </div>
                <Switch checked={autoNotify} onCheckedChange={setAutoNotify} />
              </div>
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Botões de navegação */}
        <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 && !showNewUnit}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={handleNext}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={!chargeData.amount || !chargeData.due_date}
            >
              Finalizar Cadastro
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
