import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Mail, Send, Settings, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WeeklyReports = () => {
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [reportType, setReportType] = useState('weekly');
  const [autoSend, setAutoSend] = useState(false);
  const [sendDay, setSendDay] = useState('monday');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCondominiums();
    // Load mock report history
    setReportHistory([
      {
        id: 1,
        condominium: 'Condomínio Villa Real',
        type: 'Semanal',
        sentAt: '2024-01-15 09:00',
        recipient: 'sindico@villareal.com.br',
        status: 'success'
      },
      {
        id: 2,
        condominium: 'Residencial Jardins',
        type: 'Mensal',
        sentAt: '2024-01-10 14:30',
        recipient: 'admin@jardins.com.br',
        status: 'success'
      },
      {
        id: 3,
        condominium: 'Edifício Central Park',
        type: 'Semanal',
        sentAt: '2024-01-08 10:15',
        recipient: 'sindico@centralpark.com.br',
        status: 'failed'
      }
    ]);
  }, []);

  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name');
      
      if (error) throw error;
      setCondominiums(data || []);
    } catch (error) {
      console.error('Error fetching condominiums:', error);
      // Fallback to mock data
      setCondominiums([
        { id: '1', name: 'Condomínio Villa Real' },
        { id: '2', name: 'Residencial Jardins' },
        { id: '3', name: 'Edifício Central Park' },
        { id: '4', name: 'Condomínio Sunset' },
      ]);
    }
  };

  const sendReport = async () => {
    if (!selectedCondominium || !recipientEmail) {
      toast({
        title: "Erro",
        description: "Selecione um condomínio e insira o email do destinatário",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-report', {
        body: {
          condominiumId: selectedCondominium,
          reportType,
          emailTo: recipientEmail
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Relatório enviado com sucesso!",
      });

      // Add to history (in a real implementation, this would be stored in the database)
      const selectedCondo = condominiums.find(c => c.id === selectedCondominium);
      const newReport = {
        id: Date.now(),
        condominium: selectedCondo?.name || '',
        type: reportType === 'weekly' ? 'Semanal' : 'Mensal',
        sentAt: new Date().toLocaleString('pt-BR'),
        recipient: recipientEmail,
        status: 'success'
      };
      setReportHistory(prev => [newReport, ...prev]);

    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-ffp-navy">
            <FileText className="w-5 h-5" />
            Relatórios Semanais/Mensais
          </CardTitle>
          <CardDescription>
            Configure e envie relatórios automáticos para síndicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="send" className="space-y-6">
            <TabsList>
              <TabsTrigger value="send">Enviar Relatório</TabsTrigger>
              <TabsTrigger value="schedule">Agendamento</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="condominium">Condomínio</Label>
                    <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um condomínio" />
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
                    <Label htmlFor="email">Email do Síndico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="sindico@email.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Tipo de Relatório</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={sendReport} 
                    disabled={isLoading || !selectedCondominium || !recipientEmail}
                    className="w-full bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Relatório
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-ffp-navy mb-3">Conteúdo do Relatório</h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Resumo executivo do condomínio</li>
                    <li>• Situação financeira (pagas, pendentes, vencidas)</li>
                    <li>• Estatísticas de comunicação</li>
                    <li>• Taxa de sucesso e inadimplência</li>
                    <li>• Eficiência de comunicação</li>
                    <li>• Análise de performance</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-ffp-navy">Envio Automático</h4>
                    <p className="text-sm text-gray-600">Configure relatórios para serem enviados automaticamente</p>
                  </div>
                  <Switch
                    checked={autoSend}
                    onCheckedChange={setAutoSend}
                  />
                </div>

                {autoSend && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="schedule-day">Dia da Semana</Label>
                      <Select value={sendDay} onValueChange={setSendDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Segunda-feira</SelectItem>
                          <SelectItem value="tuesday">Terça-feira</SelectItem>
                          <SelectItem value="wednesday">Quarta-feira</SelectItem>
                          <SelectItem value="thursday">Quinta-feira</SelectItem>
                          <SelectItem value="friday">Sexta-feira</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="schedule-time">Horário</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        defaultValue="09:00"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Button className="w-full bg-ffp-navy hover:bg-ffp-navy-dark text-white">
                        <Settings className="w-4 h-4 mr-2" />
                        Salvar Configuração
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                {reportHistory.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-ffp-navy">{report.condominium}</h4>
                          <p className="text-sm text-gray-600">
                            {report.type} • {formatDate(report.sentAt)}
                          </p>
                          <p className="text-sm text-gray-500">{report.recipient}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          <Button variant="outline" size="sm">
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyReports;