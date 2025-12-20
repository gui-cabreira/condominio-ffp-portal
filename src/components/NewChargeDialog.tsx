import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { CPFInput } from '@/components/forms/CPFInput';
import { AddressForm, AddressData } from '@/components/forms/AddressForm';

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

      toast({
        title: 'Sucesso',
        description: 'Cobrança cadastrada com sucesso',
      });

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
                    Anexe o boleto para pré-preencher dados automaticamente (funcionalidade futura)
                  </p>
                </CardContent>
              </Card>

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
            <div className="space-y-4">
              {/* Resumo da seleção */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Resumo</CardTitle>
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

              {/* Dados da cobrança */}
              <div>
                <Label htmlFor="amount">Valor da Cobrança *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={chargeData.amount}
                  onChange={(e) => setChargeData({ ...chargeData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>

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
