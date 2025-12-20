import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Upload, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { CPFInput } from '@/components/forms/CPFInput';
import { AddressForm, AddressData } from '@/components/forms/AddressForm';
import { QuickAddAdministratorDialog } from './QuickAddAdministratorDialog';
import { QuickAddCondominiumDialog } from './QuickAddCondominiumDialog';

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administrators: any[];
  condominiums: any[];
  units: any[];
  onSuccess: () => void;
}

interface NewUnitData {
  unit_number: string;
  tower: string;
  block: string;
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

export function NegotiationDialog({ 
  open, 
  onOpenChange, 
  administrators, 
  condominiums, 
  units,
  onSuccess 
}: NegotiationDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedAdministrator, setSelectedAdministrator] = useState('');
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [showAddCondoDialog, setShowAddCondoDialog] = useState(false);
  const [localAdministrators, setLocalAdministrators] = useState(administrators);
  const [localCondominiums, setLocalCondominiums] = useState(condominiums);
  
  const [newUnit, setNewUnit] = useState<NewUnitData>({
    unit_number: '',
    tower: '',
    block: '',
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
    principal_amount: 0,
    interest_rate: 0,
    fees_rate: 10,
    due_date: '',
    reference_month: '',
    description: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadWorkflows();
      loadDefaultParameters();
    }
  }, [open]);

  useEffect(() => {
    setLocalAdministrators(administrators);
  }, [administrators]);

  useEffect(() => {
    setLocalCondominiums(condominiums);
  }, [condominiums]);

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

  const loadDefaultParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('negotiation_parameters')
        .select('*');

      if (error) throw error;

      const params: Record<string, number> = {};
      data?.forEach(param => {
        const value = typeof param.parameter_value === 'string' 
          ? parseFloat(param.parameter_value)
          : param.parameter_value;
        params[param.parameter_key] = value;
      });

      setChargeData(prev => ({
        ...prev,
        fees_rate: params.default_fees_rate || 10,
        interest_rate: params.default_interest_rate || 2,
      }));
    } catch (error) {
      console.error('Error loading parameters:', error);
    }
  };

  const calculateTotal = () => {
    const principal = chargeData.principal_amount || 0;
    const fees = (principal * (chargeData.fees_rate / 100));
    
    // Calcular meses de atraso se tiver data de vencimento
    let interest = 0;
    if (chargeData.due_date) {
      const dueDate = new Date(chargeData.due_date);
      const today = new Date();
      const monthsDiff = Math.max(0, 
        (today.getFullYear() - dueDate.getFullYear()) * 12 + 
        (today.getMonth() - dueDate.getMonth())
      );
      interest = (principal * (chargeData.interest_rate / 100) * monthsDiff);
    }
    
    const total = principal + fees + interest;
    
    return {
      principal,
      fees,
      interest,
      total,
      monthsOverdue: chargeData.due_date ? Math.max(0, 
        (new Date().getFullYear() - new Date(chargeData.due_date).getFullYear()) * 12 + 
        (new Date().getMonth() - new Date(chargeData.due_date).getMonth())
      ) : 0
    };
  };

  const filteredCondominiums = selectedAdministrator
    ? localCondominiums.filter(c => c.administrator_id === selectedAdministrator)
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
            tower: newUnit.tower,
            block: newUnit.block,
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

      const calculation = calculateTotal();

      // Criar negociação
      const { data: chargeResult, error: chargeError } = await supabase
        .from('charges')
        .insert([{
          unit_id: unitId,
          amount: calculation.total,
          principal_amount: chargeData.principal_amount,
          interest_rate: chargeData.interest_rate,
          fees_rate: chargeData.fees_rate,
          total_with_fees: calculation.total,
          due_date: chargeData.due_date,
          reference_month: chargeData.reference_month || null,
          description: chargeData.description || null,
          administrator_id: selectedAdministrator,
          workflow_id: selectedWorkflow || null,
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
            description: 'Negociação criada, mas erro ao enviar boleto',
            variant: 'default',
          });
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Negociação cadastrada com sucesso',
      });

      // Reset do formulário
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating negotiation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar negociação',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedAdministrator('');
    setSelectedCondominium('');
    setSelectedUnit('');
    setSelectedWorkflow('');
    setShowNewUnit(false);
    setNewUnit({
      unit_number: '',
      tower: '',
      block: '',
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
    setChargeData({ 
      principal_amount: 0, 
      interest_rate: 0,
      fees_rate: 10,
      due_date: '', 
      reference_month: '', 
      description: '' 
    });
    setBoletoFile(null);
  };

  const getSelectedAdministratorName = () => 
    localAdministrators.find(a => a.id === selectedAdministrator)?.name || '';
  
  const getSelectedCondominiumName = () => 
    localCondominiums.find(c => c.id === selectedCondominium)?.name || '';
  
  const getSelectedUnitInfo = () => {
    if (showNewUnit) {
      return `Nova Unidade: ${newUnit.unit_number}${newUnit.tower ? ` - Torre ${newUnit.tower}` : ''}${newUnit.block ? ` - Bloco ${newUnit.block}` : ''} - ${newUnit.owner_name}`;
    }
    const unit = units.find(u => u.id === selectedUnit);
    return unit ? `Unidade ${unit.unit_number}${unit.tower ? ` - Torre ${unit.tower}` : ''}${unit.block ? ` - Bloco ${unit.block}` : ''} - ${unit.owner_name}` : '';
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

  const calculation = calculateTotal();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Nova Negociação - Etapa {step} de 4</DialogTitle>
            <DialogDescription>
              {step === 1 && 'Selecione ou cadastre a administradora'}
              {step === 2 && 'Selecione ou cadastre o condomínio'}
              {step === 3 && !showNewUnit && 'Selecione ou cadastre uma unidade'}
              {step === 3 && showNewUnit && 'Cadastre os dados completos do proprietário'}
              {step === 4 && 'Defina os valores e finalize a negociação'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-180px)] px-6">
            <div className="space-y-4 pb-6">
              {/* Etapa 1: Administradora */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Administradora *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAdminDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Administradora
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {localAdministrators.map((admin) => (
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
                  <div className="flex items-center justify-between">
                    <Label>Condomínio *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCondoDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Condomínio
                    </Button>
                  </div>
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
                          <div className="font-medium">
                            Unidade {unit.unit_number}
                            {unit.tower && ` - Torre ${unit.tower}`}
                            {unit.block && ` - Bloco ${unit.block}`}
                          </div>
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
                  <Card className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-base">Anexar Boleto (Opcional)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        id="boleto_upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setBoletoFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Anexe o boleto para referência futura
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Dados da Unidade</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="unit_number">Número *</Label>
                        <Input
                          id="unit_number"
                          value={newUnit.unit_number}
                          onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
                          placeholder="Ex: 101"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="tower">Torre</Label>
                        <Input
                          id="tower"
                          value={newUnit.tower}
                          onChange={(e) => setNewUnit({ ...newUnit, tower: e.target.value })}
                          placeholder="Ex: A"
                        />
                      </div>

                      <div>
                        <Label htmlFor="block">Bloco</Label>
                        <Input
                          id="block"
                          value={newUnit.block}
                          onChange={(e) => setNewUnit({ ...newUnit, block: e.target.value })}
                          placeholder="Ex: 1"
                        />
                      </div>
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

              {/* Etapa 4: Dados da Negociação */}
              {step === 4 && (
                <div className="space-y-4">
                  {/* Resumo da seleção */}
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Resumo da Seleção</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Administradora:</span> {getSelectedAdministratorName()}
                      </div>
                      <div>
                        <span className="font-medium">Condomínio:</span> {getSelectedCondominiumName()}
                      </div>
                      <div>
                        <span className="font-medium">Unidade:</span> {getSelectedUnitInfo()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Valores */}
                  <div>
                    <Label htmlFor="principal_amount">Valor Principal (R$) *</Label>
                    <Input
                      id="principal_amount"
                      type="number"
                      step="0.01"
                      value={chargeData.principal_amount}
                      onChange={(e) => setChargeData({ ...chargeData, principal_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor original da cobrança, sem juros e honorários
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fees_rate">Honorários (%)</Label>
                      <Input
                        id="fees_rate"
                        type="number"
                        step="0.01"
                        value={chargeData.fees_rate}
                        onChange={(e) => setChargeData({ ...chargeData, fees_rate: parseFloat(e.target.value) || 0 })}
                        placeholder="10.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="interest_rate">Juros ao Mês (%)</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.01"
                        value={chargeData.interest_rate}
                        onChange={(e) => setChargeData({ ...chargeData, interest_rate: parseFloat(e.target.value) || 0 })}
                        placeholder="2.00"
                      />
                    </div>
                  </div>

                  {/* Cálculo automático */}
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Cálculo Automático
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Principal:</span>
                        <span className="font-medium">R$ {calculation.principal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Honorários ({chargeData.fees_rate}%):</span>
                        <span className="font-medium text-orange-600">+ R$ {calculation.fees.toFixed(2)}</span>
                      </div>
                      {calculation.monthsOverdue > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Juros ({calculation.monthsOverdue} {calculation.monthsOverdue === 1 ? 'mês' : 'meses'}):
                          </span>
                          <span className="font-medium text-red-600">+ R$ {calculation.interest.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-green-200 my-2"></div>
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-green-800">Valor Total:</span>
                        <span className="text-green-700">R$ {calculation.total.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

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
                      placeholder="Descrição da negociação"
                    />
                  </div>

                  <div>
                    <Label htmlFor="workflow">Workflow de Cobrança</Label>
                    <select
                      id="workflow"
                      className="w-full p-2 border rounded-md bg-background"
                      value={selectedWorkflow}
                      onChange={(e) => setSelectedWorkflow(e.target.value)}
                    >
                      <option value="">Selecione um workflow (opcional)</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      O workflow define as etapas automáticas de cobrança
                    </p>
                  </div>

                  {boletoFile && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">{boletoFile.name}</span>
                    </div>
                  )}
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
                disabled={!chargeData.principal_amount || !chargeData.due_date}
              >
                Finalizar Cadastro
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs de cadastro rápido */}
      <QuickAddAdministratorDialog
        open={showAddAdminDialog}
        onOpenChange={setShowAddAdminDialog}
        onSuccess={(newAdmin) => {
          setLocalAdministrators([...localAdministrators, newAdmin]);
          setSelectedAdministrator(newAdmin.id);
          onSuccess(); // Recarregar dados
        }}
      />

      <QuickAddCondominiumDialog
        open={showAddCondoDialog}
        onOpenChange={setShowAddCondoDialog}
        administratorId={selectedAdministrator}
        onSuccess={(newCondo) => {
          setLocalCondominiums([...localCondominiums, newCondo]);
          setSelectedCondominium(newCondo.id);
          onSuccess(); // Recarregar dados
        }}
      />
    </>
  );
}
