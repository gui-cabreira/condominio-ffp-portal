
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, FileText, Download, MessageSquare, Bell, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ClientDashboard = () => {
  const [hasCharges, setHasCharges] = React.useState(true);

  // Dados mockados para demonstração
  const documents = [
    { id: 1, name: 'Contrato de Prestação de Serviços', date: '2024-01-10', type: 'PDF' },
    { id: 2, name: 'Relatório Mensal - Dezembro 2023', date: '2024-01-05', type: 'PDF' },
    { id: 3, name: 'Documento de Cobrança', date: '2023-12-28', type: 'PDF' },
  ];

  const messages = [
    { id: 1, subject: 'Atualização sobre seu processo', date: '2024-01-12', unread: true },
    { id: 2, subject: 'Documentos disponíveis para download', date: '2024-01-10', unread: false },
    { id: 3, subject: 'Reunião agendada para próxima semana', date: '2024-01-08', unread: false },
  ];

  const processes = [
    { id: 1, number: '2024.001.0123', description: 'Cobrança de Taxa Condominial', status: 'Em andamento' },
    { id: 2, number: '2023.012.0456', description: 'Regularização Documental', status: 'Concluído' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/d3faa2c9-dd61-45a5-a799-5fbb7fef4f58.png" 
                alt="FFP Advogados" 
                className="h-8 w-auto mr-3"
              />
              <h1 className="text-xl font-semibold text-ffp-navy">Área do Cliente</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Olá, Cliente</span>
              <Link to="/portal" className="text-ffp-navy hover:text-ffp-gold">
                <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-ffp-navy mb-2">Bem-vindo à sua área exclusiva</h2>
          <p className="text-gray-600">Acesse seus documentos, mensagens e acompanhe seus processos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documentos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-ffp-navy">
                <FileText className="w-5 h-5 mr-2" />
                Meus Documentos
              </CardTitle>
              <CardDescription>
                Documentos disponíveis para download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-ffp-gold" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{new Date(doc.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-ffp-navy">
                <MessageSquare className="w-5 h-5 mr-2" />
                Mensagens
              </CardTitle>
              <CardDescription>
                Comunicações da FFP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${message.unread ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm ${message.unread ? 'font-semibold' : ''}`}>
                          {message.subject}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {message.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy">
                <MessageSquare className="w-4 h-4 mr-2" />
                Nova Mensagem
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Processos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center text-ffp-navy">
              <Calendar className="w-5 h-5 mr-2" />
              Meus Processos
            </CardTitle>
            <CardDescription>
              Acompanhe o andamento dos seus processos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Número</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Descrição</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((process) => (
                    <tr key={process.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{process.number}</td>
                      <td className="py-3 px-4">{process.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          process.status === 'Concluído' 
                            ? 'text-green-600 bg-green-100' 
                            : 'text-blue-600 bg-blue-100'
                        }`}>
                          {process.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">Ver Detalhes</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-ffp-navy">Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Nossa equipe está sempre disponível para atendê-lo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Agendar Reunião
              </Button>
              <a 
                href="tel:+5519999331777"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                📞 (19) 99933-1777
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
