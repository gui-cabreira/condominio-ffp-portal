import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Send, Calculator, Building2, User, Phone, Mail, Calendar, DollarSign, Percent, FileText, Settings, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const RegisterDefaulter = () => {
  const [activeTab, setActiveTab] = useState('debtor');
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [calculatedValues, setCalculatedValues] = useState({
    originalValue: 1200.00,
    interest: 84.00,
    adminFee: 50.00,
    lawyers: 180.00,
    currentValue: 1514.00
  });

  // Dados mockados
  const condominiums = [
    { id: 'villa-real', name: 'Condomínio Villa Real', adminFee: 50, interestRate: 2, lawyersFee: 15 },
    { id: 'jardins', name: 'Residencial Jardins', adminFee: 40, interestRate: 1.8, lawyersFee: 12 },
    { id: 'central-park', name: 'Edifício Central Park', adminFee: 60, interestRate: 2.2, lawyersFee: 18 },
    { id: 'sunset', name: 'Condomínio Sunset', adminFee: 45, interestRate: 2, lawyersFee: 15 }
  ];

  const partnerships = [
    { id: 'admin1', name: 'Administradora Central', contact: 'contato@admincentral.com' },
    { id: 'admin2', name: 'Gestão Predial Plus', contact: 'info@gestaoplus.com' },
    { id: 'admin3', name: 'Administradora Vila', contact: 'admin@vila.com.br' }
  ];

  const messageTemplates = {
    whatsapp: `Olá {nome}!

Estamos entrando em contato para informar sobre uma pendência financeira referente ao {condominio}.

💰 Valor Original: R$ {valor_original}
📅 Vencimento: {data_vencimento}
💳 Valor Atual: R$ {valor_atual}

Para regularizar sua situação, acesse: {link}

Em caso de dúvidas, estamos à disposição!`,
    
    email: `Prezado(a) {nome},

Informamos que existe uma pendência em aberto referente ao condomínio {condominio}, unidade {unidade}.

DETALHES DA COBRANÇA:
- Valor Original: R$ {valor_original}
- Data de Vencimento: {data_vencimento}
- Juros e Correção: R$ {juros}
- Taxa Administrativa: R$ {taxa_admin}
- Honorários Advocatícios: R$ {honorarios}
- VALOR TOTAL ATUAL: R$ {valor_atual}

Para efetuar o pagamento, acesse o link: {link}

Atenciosamente,
FFP Advogados`
  };

  const calculateValues = () => {
    const originalValue = calculatedValues.originalValue;
    const selectedCondo = condominiums.find(c => c.id === selectedCondominium);
    
    if (selectedCondo) {
      const interest = originalValue * (selectedCondo.interestRate / 100) * 3.5; // 3.5 meses em atraso
      const adminFee = selectedCondo.adminFee;
      const lawyers = originalValue * (selectedCondo.lawyersFee / 100);
      const currentValue = originalValue + interest + adminFee + lawyers;
      
      setCalculatedValues({
        originalValue,
        interest,
        adminFee,
        lawyers,
        currentValue
      });
    }
  };

  React.useEffect(() => {
    if (selectedCondominium) {
      calculateValues();
    }
  }, [selectedCondominium]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/portal/corporativo/dashboard" className="mr-4">
                <ArrowLeft className="w-5 h-5 text-ffp-navy hover:text-ffp-gold" />
              </Link>
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-semibold text-ffp-navy">Cadastro de Inadimplente</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar
              </Button>
              <Button className="bg-ffp-navy hover:bg-ffp-navy-dark text-white">
                <Save className="w-4 h-4 mr-2" />
                Salvar Cadastro
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="debtor">Dados do Devedor</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="communication">Comunicação</TabsTrigger>
            <TabsTrigger value="preview">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="debtor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input id="name" placeholder="Nome do devedor" />
                    </div>
                    <div>
                      <Label htmlFor="document">CPF/CNPJ *</Label>
                      <Input id="document" placeholder="000.000.000-00" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" placeholder="(19) 99999-9999" />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" placeholder="email@exemplo.com" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Textarea id="address" placeholder="Rua, número, bairro, cidade - CEP" />
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Condomínio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Dados do Condomínio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="condominium">Condomínio *</Label>
                    <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o condomínio" />
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

                  <div>
                    <Label htmlFor="partnership">Administradora/Parceria</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a administradora" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnerships.map((partnership) => (
                          <SelectItem key={partnership.id} value={partnership.id}>
                            {partnership.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit">Unidade *</Label>
                      <Input id="unit" placeholder="Apto 101, Casa 5, etc." />
                    </div>
                    <div>
                      <Label htmlFor="block">Bloco/Torre</Label>
                      <Input id="block" placeholder="Bloco A, Torre 1, etc." />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição da Dívida</Label>
                    <Textarea id="description" placeholder="Condomínio referente ao mês de..." />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Valores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Valores da Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="original-value">Valor Original *</Label>
                      <Input 
                        id="original-value" 
                        type="number" 
                        placeholder="0,00"
                        value={calculatedValues.originalValue}
                        onChange={(e) => setCalculatedValues({
                          ...calculatedValues,
                          originalValue: Number(e.target.value)
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="due-date">Data Vencimento *</Label>
                      <Input id="due-date" type="date" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Valor Original</span>
                      <span className="font-semibold">R$ {calculatedValues.originalValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Juros e Correção</span>
                      <span className="text-red-600">+ R$ {calculatedValues.interest.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taxa Administrativa</span>
                      <span className="text-red-600">+ R$ {calculatedValues.adminFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Honorários Advocatícios</span>
                      <span className="text-red-600">+ R$ {calculatedValues.lawyers.toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Valor Total Atual</span>
                      <span className="text-ffp-navy">R$ {calculatedValues.currentValue.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={calculateValues}>
                    <Calculator className="w-4 h-4 mr-2" />
                    Recalcular Valores
                  </Button>
                </CardContent>
              </Card>

              {/* Configurações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Parâmetros de Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCondominium && (
                    <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                      <h4 className="font-medium text-ffp-navy">Configurações do Condomínio</h4>
                      {(() => {
                        const condo = condominiums.find(c => c.id === selectedCondominium);
                        return condo ? (
                          <div className="text-sm space-y-1">
                            <p>Taxa Administrativa: R$ {condo.adminFee},00</p>
                            <p>Juros Mensal: {condo.interestRate}%</p>
                            <p>Honorários: {condo.lawyersFee}%</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="custom-interest">Juros Personalizado (%)</Label>
                      <Input id="custom-interest" type="number" placeholder="2.0" step="0.1" />
                    </div>
                    
                    <div>
                      <Label htmlFor="custom-admin">Taxa Admin. Personalizada</Label>
                      <Input id="custom-admin" type="number" placeholder="50.00" />
                    </div>
                    
                    <div>
                      <Label htmlFor="custom-lawyers">Honorários Personalizados (%)</Label>
                      <Input id="custom-lawyers" type="number" placeholder="15.0" step="0.1" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payment-slip">Gerar Boleto</Label>
                      <Switch id="payment-slip" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pix-option">Incluir PIX</Label>
                      <Switch id="pix-option" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="installments">Permitir Parcelamento</Label>
                      <Switch id="installments" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communication">
            <div className="space-y-6">
              {/* Configurações de Envio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-ffp-navy">Configurações de Comunicação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="send-whatsapp" defaultChecked />
                        <Label htmlFor="send-whatsapp">Enviar por WhatsApp</Label>
                      </div>
                      <div>
                        <Label htmlFor="whatsapp-delay">Enviar em (dias)</Label>
                        <Select defaultValue="0">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Imediatamente</SelectItem>
                            <SelectItem value="1">1 dia</SelectItem>
                            <SelectItem value="3">3 dias</SelectItem>
                            <SelectItem value="7">7 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="send-email" defaultChecked />
                        <Label htmlFor="send-email">Enviar por E-mail</Label>
                      </div>
                      <div>
                        <Label htmlFor="email-delay">Enviar em (dias)</Label>
                        <Select defaultValue="1">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Imediatamente</SelectItem>
                            <SelectItem value="1">1 dia</SelectItem>
                            <SelectItem value="3">3 dias</SelectItem>
                            <SelectItem value="7">7 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="send-sms" />
                        <Label htmlFor="send-sms">Enviar por SMS</Label>
                      </div>
                      <div>
                        <Label htmlFor="sms-delay">Enviar em (dias)</Label>
                        <Select defaultValue="7">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 dias</SelectItem>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="15">15 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Templates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-ffp-navy">Template WhatsApp</CardTitle>
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={messageTemplates.whatsapp}
                      rows={8}
                      className="text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['nome', 'condominio', 'valor_original', 'data_vencimento', 'valor_atual', 'link'].map((variable) => (
                        <span key={variable} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-ffp-navy">Template E-mail</CardTitle>
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={messageTemplates.email}
                      rows={8}
                      className="text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['nome', 'condominio', 'unidade', 'valor_original', 'data_vencimento', 'juros', 'taxa_admin', 'honorarios', 'valor_atual', 'link'].map((variable) => (
                        <span key={variable} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="text-ffp-navy">Resumo do Cadastro</CardTitle>
                <CardDescription>
                  Revise todas as informações antes de salvar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-ffp-navy mb-3">Dados do Devedor</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Nome:</strong> João Silva Santos</p>
                        <p><strong>CPF:</strong> 123.456.789-00</p>
                        <p><strong>Telefone:</strong> (19) 99999-9999</p>
                        <p><strong>E-mail:</strong> joao@email.com</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-ffp-navy mb-3">Condomínio</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Nome:</strong> Condomínio Villa Real</p>
                        <p><strong>Unidade:</strong> Apto 101</p>
                        <p><strong>Administradora:</strong> Administradora Central</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-ffp-navy mb-3">Valores</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Valor Original:</span>
                          <span>R$ {calculatedValues.originalValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Juros e Correção:</span>
                          <span className="text-red-600">R$ {calculatedValues.interest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa Administrativa:</span>
                          <span className="text-red-600">R$ {calculatedValues.adminFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Honorários:</span>
                          <span className="text-red-600">R$ {calculatedValues.lawyers.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span className="text-ffp-navy">R$ {calculatedValues.currentValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-ffp-navy mb-3">Comunicação</h3>
                      <div className="space-y-2 text-sm">
                        <p>✅ WhatsApp - Imediatamente</p>
                        <p>✅ E-mail - Em 1 dia</p>
                        <p>❌ SMS</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setActiveTab('communication')}>
                    Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Pré-visualizar Mensagens
                    </Button>
                    <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                      <Send className="w-4 h-4 mr-2" />
                      Cadastrar e Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RegisterDefaulter;