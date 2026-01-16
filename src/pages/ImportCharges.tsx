import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, User, Building2, Home, FileText, CheckCircle, Send, Loader2, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface Administrator {
  id: string;
  name: string;
  email: string;
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
  owner_email: string | null;
  owner_phone: string | null;
  condominium_id: string;
}

const ImportCharges = () => {
  // Step control
  const [step, setStep] = useState(1);
  
  // Selections
  const [selectedAdministrator, setSelectedAdministrator] = useState<string>('');
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  
  // New unit form
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    unit_number: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
  });
  
  // Charge data
  const [chargeAmount, setChargeAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [referenceMonth, setReferenceMonth] = useState('');
  const [description, setDescription] = useState('');
  
  // Boleto file
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    chargeId?: string;
    whatsapp?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
  } | null>(null);

  // Fetch administrators
  const { data: administrators = [] } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('id, name, email')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Administrator[];
    }
  });

  // Fetch condominiums based on selected administrator
  const { data: condominiums = [] } = useQuery({
    queryKey: ['condominiums', selectedAdministrator],
    queryFn: async () => {
      let query = supabase
        .from('condominiums')
        .select('id, name, address, administrator_id')
        .order('name');
      
      if (selectedAdministrator) {
        query = query.eq('administrator_id', selectedAdministrator);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Condominium[];
    },
    enabled: !!selectedAdministrator
  });

  // Fetch units based on selected condominium
  const { data: units = [] } = useQuery({
    queryKey: ['units', selectedCondominium],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, owner_name, owner_email, owner_phone, condominium_id')
        .eq('condominium_id', selectedCondominium)
        .order('unit_number');
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!selectedCondominium
  });

  // Get selected entities
  const selectedAdminData = administrators.find(a => a.id === selectedAdministrator);
  const selectedCondoData = condominiums.find(c => c.id === selectedCondominium);
  const selectedUnitData = units.find(u => u.id === selectedUnit);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setBoletoFile(file);
        toast.success(`Boleto "${file.name}" anexado com sucesso!`);
      } else {
        toast.error('Por favor, anexe apenas arquivos PDF');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setBoletoFile(file);
        toast.success(`Boleto "${file.name}" anexado com sucesso!`);
      } else {
        toast.error('Por favor, anexe apenas arquivos PDF');
      }
    }
  };

  // Handle registration and notification
  const handleSubmit = async () => {
    // Validate required fields
    if (!selectedCondominium) {
      toast.error('Selecione um condomínio');
      return;
    }

    let unitId = selectedUnit;
    
    // If new unit, create it first
    if (showNewUnit) {
      if (!newUnitData.unit_number || !newUnitData.owner_name) {
        toast.error('Preencha pelo menos unidade e nome do proprietário');
        return;
      }
      
      const { data: newUnit, error: unitError } = await supabase
        .from('units')
        .insert({
          condominium_id: selectedCondominium,
          unit_number: newUnitData.unit_number,
          owner_name: newUnitData.owner_name,
          owner_email: newUnitData.owner_email || null,
          owner_phone: newUnitData.owner_phone || null,
        })
        .select()
        .single();
        
      if (unitError) {
        toast.error('Erro ao cadastrar unidade: ' + unitError.message);
        return;
      }
      
      unitId = newUnit.id;
    }
    
    if (!unitId) {
      toast.error('Selecione ou cadastre uma unidade');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // 1. Create charge
      const amount = parseFloat(chargeAmount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const { data: charge, error: chargeError } = await supabase
        .from('charges')
        .insert({
          unit_id: unitId,
          administrator_id: selectedAdministrator || null,
          amount: amount,
          due_date: dueDate || new Date().toISOString().split('T')[0],
          reference_month: referenceMonth || null,
          description: description || 'Cobrança condominial',
          status: 'pending',
          pipeline_stage: 'new',
        })
        .select()
        .single();

      if (chargeError) throw chargeError;

      console.log('✅ Cobrança criada:', charge.id);

      // 2. Upload boleto if provided
      if (boletoFile) {
        const fileName = `${charge.id}/${Date.now()}_${boletoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('boletos')
          .upload(fileName, boletoFile);

        if (uploadError) {
          console.error('Erro ao fazer upload do boleto:', uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('boletos')
            .getPublicUrl(fileName);

          // Update charge with boleto URL
          await supabase
            .from('charges')
            .update({ boleto_url: urlData.publicUrl })
            .eq('id', charge.id);

          console.log('✅ Boleto anexado:', urlData.publicUrl);
        }
      }

      // 3. Add timeline event
      await supabase
        .from('charge_timeline')
        .insert({
          charge_id: charge.id,
          event_type: 'created',
          event_data: {
            description: 'Cobrança cadastrada via importação manual',
            boleto_attached: !!boletoFile,
          }
        });

      // 4. Send notifications (WhatsApp + Email)
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-charge-notification', {
        body: {
          chargeId: charge.id,
          channel: 'all',
        }
      });

      if (notificationError) {
        console.error('Erro ao enviar notificações:', notificationError);
        setSendResult({
          success: true,
          chargeId: charge.id,
          whatsapp: { success: false, error: notificationError.message },
          email: { success: false, error: notificationError.message },
        });
      } else {
        console.log('✅ Notificações enviadas:', notificationResult);
        setSendResult({
          success: true,
          chargeId: charge.id,
          whatsapp: notificationResult?.results?.whatsapp || { success: false, error: 'Não enviado' },
          email: notificationResult?.results?.email || { success: false, error: 'Não enviado' },
        });
      }

      toast.success('Cobrança cadastrada e notificações disparadas!');
      
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error('Erro ao processar: ' + error.message);
      setSendResult(null);
    } finally {
      setIsSending(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setStep(1);
    setSelectedAdministrator('');
    setSelectedCondominium('');
    setSelectedUnit('');
    setShowNewUnit(false);
    setNewUnitData({ unit_number: '', owner_name: '', owner_email: '', owner_phone: '' });
    setChargeAmount('');
    setDueDate('');
    setReferenceMonth('');
    setDescription('');
    setBoletoFile(null);
    setSendResult(null);
  };

  const canProceedToStep2 = selectedAdministrator && selectedCondominium;
  const canProceedToStep3 = selectedUnit || (showNewUnit && newUnitData.unit_number && newUnitData.owner_name);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/portal/corporativo/dashboard">
                <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Cadastrar Inadimplente</h1>
                <p className="text-sm text-muted-foreground">Cadastro individual com disparo automático</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={step >= 1 ? 'default' : 'secondary'}>1. Seleção</Badge>
              <span>→</span>
              <Badge variant={step >= 2 ? 'default' : 'secondary'}>2. Unidade</Badge>
              <span>→</span>
              <Badge variant={step >= 3 ? 'default' : 'secondary'}>3. Boleto</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sendResult ? (
          // Result Screen
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Cobrança Cadastrada!</CardTitle>
              <CardDescription>
                O inadimplente foi cadastrado e as notificações foram disparadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Administradora:</span>
                  <span className="font-medium">{selectedAdminData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condomínio:</span>
                  <span className="font-medium">{selectedCondoData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidade:</span>
                  <span className="font-medium">
                    {showNewUnit ? newUnitData.unit_number : selectedUnitData?.unit_number}
                  </span>
                </div>
                {chargeAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{chargeAmount}</span>
                  </div>
                )}
              </div>

              {/* Notification Status */}
              <div className="space-y-3">
                <h4 className="font-medium">Status das Notificações:</h4>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <span>WhatsApp</span>
                  </div>
                  {sendResult.whatsapp?.success ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">Enviado</Badge>
                  ) : (
                    <Badge variant="destructive">{sendResult.whatsapp?.error || 'Falhou'}</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>Email</span>
                  </div>
                  {sendResult.email?.success ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">Enviado</Badge>
                  ) : (
                    <Badge variant="destructive">{sendResult.email?.error || 'Falhou'}</Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  Cadastrar Outro
                </Button>
                <Link to="/portal/corporativo/pipeline" className="flex-1">
                  <Button className="w-full">
                    Ver no Pipeline
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Step 1: Administrator & Condominium */}
            <Card className={step === 1 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  1. Administradora e Condomínio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Administradora</Label>
                  <Select 
                    value={selectedAdministrator} 
                    onValueChange={(v) => {
                      setSelectedAdministrator(v);
                      setSelectedCondominium('');
                      setSelectedUnit('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {administrators.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Condomínio</Label>
                  <Select 
                    value={selectedCondominium} 
                    onValueChange={(v) => {
                      setSelectedCondominium(v);
                      setSelectedUnit('');
                    }}
                    disabled={!selectedAdministrator}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {condominiums.map((condo) => (
                        <SelectItem key={condo.id} value={condo.id}>
                          {condo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canProceedToStep2 && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => setStep(2)}
                  >
                    Próximo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Unit/Owner */}
            <Card className={step === 2 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  2. Unidade / Proprietário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showNewUnit ? (
                  <>
                    <div className="space-y-2">
                      <Label>Selecionar Unidade Existente</Label>
                      <Select 
                        value={selectedUnit} 
                        onValueChange={setSelectedUnit}
                        disabled={!selectedCondominium}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.unit_number} - {unit.owner_name || 'Sem nome'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedUnitData && (
                      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                        <p><strong>Nome:</strong> {selectedUnitData.owner_name || '-'}</p>
                        <p><strong>Email:</strong> {selectedUnitData.owner_email || '-'}</p>
                        <p><strong>Telefone:</strong> {selectedUnitData.owner_phone || '-'}</p>
                      </div>
                    )}

                    <Separator />
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowNewUnit(true)}
                      disabled={!selectedCondominium}
                    >
                      + Cadastrar Nova Unidade
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Número/Identificação da Unidade *</Label>
                        <Input
                          value={newUnitData.unit_number}
                          onChange={(e) => setNewUnitData({ ...newUnitData, unit_number: e.target.value })}
                          placeholder="Ex: Apto 101, Bloco A"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Nome do Proprietário *</Label>
                        <Input
                          value={newUnitData.owner_name}
                          onChange={(e) => setNewUnitData({ ...newUnitData, owner_name: e.target.value })}
                          placeholder="Nome completo"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newUnitData.owner_email}
                          onChange={(e) => setNewUnitData({ ...newUnitData, owner_email: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>WhatsApp</Label>
                        <Input
                          value={newUnitData.owner_phone}
                          onChange={(e) => setNewUnitData({ ...newUnitData, owner_phone: e.target.value })}
                          placeholder="5511999999999"
                        />
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowNewUnit(false)}
                    >
                      ← Voltar para seleção
                    </Button>
                  </>
                )}

                {canProceedToStep3 && step === 2 && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => setStep(3)}
                  >
                    Próximo
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Boleto & Send */}
            <Card className={step === 3 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  3. Boleto e Disparo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Optional charge details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mês de Referência</Label>
                  <Input
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    placeholder="Ex: Janeiro/2025"
                  />
                </div>

                <Separator />

                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-primary bg-primary/10' 
                      : boletoFile 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                        : 'border-muted-foreground/30 hover:border-primary'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('boleto-input')?.click()}
                >
                  {boletoFile ? (
                    <>
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      <p className="font-medium text-green-700 dark:text-green-400">{boletoFile.name}</p>
                      <p className="text-sm text-muted-foreground">Clique para trocar</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">Arraste o boleto aqui</p>
                      <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground mt-1">Apenas PDF</p>
                    </>
                  )}
                  <input
                    id="boleto-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Info about notification */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm space-y-1">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Ao finalizar:</span>
                  </div>
                  <ul className="text-muted-foreground ml-6 list-disc">
                    <li>WhatsApp será enviado automaticamente</li>
                    <li>Email será enviado automaticamente</li>
                    <li>Cobrança entrará no Pipeline de CRM</li>
                  </ul>
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSending || !canProceedToStep3}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Cadastrar e Disparar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportCharges;
