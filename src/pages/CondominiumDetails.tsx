import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageCircle, FileText, CheckCircle, Clock, X, User, DollarSign, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CondominiumDetails = () => {
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  // Dados mockados do condomínio
  const condominium = {
    id: Number(id),
    name: 'Condomínio Villa Real',
    address: 'Rua das Flores, 123 - Centro',
    totalUnits: 120,
    paidUnits: 95,
    pendingAmount: 'R$ 15.000,00',
    efficiency: 79,
    manager: 'João Silva',
    managerPhone: '(19) 99999-9999',
    managerEmail: 'joao@villareal.com.br'
  };

  // Dados mockados dos moradores
  const residents = [
    {
      id: 1,
      name: 'Maria Silva',
      unit: 'Apto 101',
      email: 'maria@email.com',
      phone: '(19) 99999-1111',
      status: 'paid',
      lastContact: '2024-01-10',
      whatsappSent: true,
      emailSent: false,
      billOpened: true,
      amount: 'R$ 850,00'
    },
    {
      id: 2,
      name: 'João Santos',
      unit: 'Apto 205',
      email: 'joao@email.com',
      phone: '(19) 99999-2222',
      status: 'pending',
      lastContact: '2024-01-15',
      whatsappSent: true,
      emailSent: true,
      billOpened: false,
      amount: 'R$ 920,00'
    },
    {
      id: 3,
      name: 'Ana Costa',
      unit: 'Apto 302',
      email: 'ana@email.com',
      phone: '(19) 99999-3333',
      status: 'overdue',
      lastContact: '2024-01-08',
      whatsappSent: true,
      emailSent: true,
      billOpened: true,
      amount: 'R$ 750,00'
    },
    {
      id: 4,
      name: 'Carlos Oliveira',
      unit: 'Apto 410',
      email: 'carlos@email.com',
      phone: '(19) 99999-4444',
      status: 'pending',
      lastContact: '2024-01-12',
      whatsappSent: false,
      emailSent: true,
      billOpened: false,
      amount: 'R$ 680,00'
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  const filteredResidents = residents.filter(resident =>
    resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h1 className="text-xl font-semibold text-ffp-navy">{condominium.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações do Condomínio */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-ffp-navy">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Endereço</p>
                  <p className="font-medium">{condominium.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Unidades</p>
                  <p className="font-medium">{condominium.totalUnits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Síndico</p>
                  <p className="font-medium">{condominium.manager}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Telefone</p>
                  <p className="font-medium">{condominium.managerPhone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">E-mail do Síndico</p>
                  <p className="font-medium">{condominium.managerEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-ffp-navy">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor em Cobrança</span>
                  <span className="font-semibold text-ffp-navy">{condominium.pendingAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unidades Pagas</span>
                  <span className="font-semibold text-green-600">{condominium.paidUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unidades Pendentes</span>
                  <span className="font-semibold text-red-600">{condominium.totalUnits - condominium.paidUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa de Sucesso</span>
                  <span className="font-semibold text-ffp-navy">{condominium.efficiency}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Moradores */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-ffp-navy">Moradores e Status de Cobrança</CardTitle>
                <CardDescription>Controle detalhado de cada unidade</CardDescription>
              </div>
              <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                Enviar Cobrança em Lote
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou unidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar Status
              </Button>
            </div>

            {/* Tabela de Moradores */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Morador</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Contato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Comunicação</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Valor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.map((resident) => (
                    <tr key={resident.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{resident.name}</div>
                          <div className="text-sm text-gray-500">{resident.unit}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {resident.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {resident.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(resident.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <div className="flex items-center">
                            <MessageCircle className={`w-4 h-4 ${resident.whatsappSent ? 'text-green-500' : 'text-gray-300'}`} />
                            {resident.whatsappSent && <CheckCircle className="w-3 h-3 text-green-500 ml-1" />}
                          </div>
                          <div className="flex items-center">
                            <Mail className={`w-4 h-4 ${resident.emailSent ? 'text-blue-500' : 'text-gray-300'}`} />
                            {resident.emailSent && <CheckCircle className="w-3 h-3 text-blue-500 ml-1" />}
                          </div>
                          <div className="flex items-center">
                            <FileText className={`w-4 h-4 ${resident.billOpened ? 'text-green-500' : 'text-gray-300'}`} />
                            {resident.billOpened && <CheckCircle className="w-3 h-3 text-green-500 ml-1" />}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {resident.amount}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">Ver</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CondominiumDetails;