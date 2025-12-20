import React, { useState, useEffect } from 'react';
import { MessageSquare, Image, BarChart3, Clock, Send, RefreshCw, User, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CoachSession {
  id: string;
  phone_number: string;
  session_status: string;
  session_type: string;
  current_step: number;
  total_steps: number;
  last_interaction_at: string;
  created_at: string;
}

interface CoachMessage {
  id: string;
  content: string;
  direction: string;
  message_type: string;
  media_url: string | null;
  sentiment: string | null;
  created_at: string;
}

interface ImageAnalysis {
  id: string;
  image_url: string;
  status: string;
  ai_response: string | null;
  confidence: number | null;
  created_at: string;
}

const EmployeeCoachPage = () => {
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CoachSession | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [imageAnalyses, setImageAnalyses] = useState<ImageAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    totalImages: 0
  });

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
      fetchImageAnalyses(selectedSession.id);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .order('last_interaction_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalSessions } = await supabase
        .from('coaching_sessions')
        .select('*', { count: 'exact', head: true });

      const { count: activeSessions } = await supabase
        .from('coaching_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('session_status', 'active');

      const { count: totalMessages } = await supabase
        .from('coaching_messages')
        .select('*', { count: 'exact', head: true });

      const { count: totalImages } = await supabase
        .from('coach_image_analyses')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        totalMessages: totalMessages || 0,
        totalImages: totalImages || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('coaching_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchImageAnalyses = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('coach_image_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImageAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching image analyses:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativo', variant: 'default' },
      completed: { label: 'Concluído', variant: 'secondary' },
      paused: { label: 'Pausado', variant: 'outline' },
      cancelled: { label: 'Cancelado', variant: 'destructive' }
    };
    const s = statuses[status] || statuses.active;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return null;
    const sentiments: Record<string, { label: string; className: string }> = {
      positive: { label: '😊 Positivo', className: 'bg-green-100 text-green-800' },
      neutral: { label: '😐 Neutro', className: 'bg-gray-100 text-gray-800' },
      negative: { label: '😔 Negativo', className: 'bg-red-100 text-red-800' }
    };
    const s = sentiments[sentiment] || sentiments.neutral;
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Coach de IA - Painel
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe sessões, mensagens e análises de imagens
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Sessões</CardDescription>
            <CardTitle className="text-3xl">{stats.totalSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sessões Ativas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.activeSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mensagens Trocadas</CardDescription>
            <CardTitle className="text-3xl">{stats.totalMessages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Imagens Analisadas</CardDescription>
            <CardTitle className="text-3xl">{stats.totalImages}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Sessões
              <Button variant="ghost" size="sm" onClick={fetchSessions}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma sessão encontrada
                </div>
              ) : (
                <div className="divide-y">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedSession?.id === session.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{session.phone_number}</span>
                        </div>
                        {getStatusBadge(session.session_status || 'active')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(session.last_interaction_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {session.total_steps > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-muted-foreground mb-1">
                            Progresso: {session.current_step}/{session.total_steps}
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${(session.current_step / session.total_steps) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card className="lg:col-span-2">
          {selectedSession ? (
            <Tabs defaultValue="messages" className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {selectedSession.phone_number}
                    </CardTitle>
                    <CardDescription>
                      Iniciado em {format(new Date(selectedSession.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedSession.session_status || 'active')}
                </div>
                <TabsList className="mt-4">
                  <TabsTrigger value="messages">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Mensagens
                  </TabsTrigger>
                  <TabsTrigger value="images">
                    <Image className="w-4 h-4 mr-2" />
                    Imagens ({imageAnalyses.length})
                  </TabsTrigger>
                  <TabsTrigger value="analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Análise
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="p-0">
                <TabsContent value="messages" className="m-0">
                  <ScrollArea className="h-[400px] p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                message.direction === 'outbound'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {message.media_url && (
                                <img 
                                  src={message.media_url} 
                                  alt="Mídia" 
                                  className="max-w-full rounded mb-2"
                                />
                              )}
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <span className="text-xs opacity-70">
                                  {format(new Date(message.created_at), "HH:mm")}
                                </span>
                                {message.sentiment && getSentimentBadge(message.sentiment)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="images" className="m-0">
                  <ScrollArea className="h-[400px] p-4">
                    {imageAnalyses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma imagem analisada ainda
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {imageAnalyses.map((analysis) => (
                          <Card key={analysis.id}>
                            <CardContent className="p-3">
                              <img 
                                src={analysis.image_url} 
                                alt="Análise" 
                                className="w-full h-32 object-cover rounded mb-2"
                              />
                              <Badge 
                                variant={analysis.status === 'completed' ? 'default' : 'secondary'}
                                className="mb-2"
                              >
                                {analysis.status === 'completed' ? 'Analisado' : 'Pendente'}
                              </Badge>
                              {analysis.ai_response && (
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                  {analysis.ai_response}
                                </p>
                              )}
                              {analysis.confidence && (
                                <p className="text-xs mt-1">
                                  Confiança: {(analysis.confidence * 100).toFixed(0)}%
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="analytics" className="m-0 p-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resumo da Sessão</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span>{selectedSession.session_type || 'Geral'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          {getStatusBadge(selectedSession.session_status || 'active')}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mensagens:</span>
                          <span>{messages.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Imagens:</span>
                          <span>{imageAnalyses.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Análise de Sentimento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const sentimentCounts = messages.reduce((acc, msg) => {
                            if (msg.sentiment) {
                              acc[msg.sentiment] = (acc[msg.sentiment] || 0) + 1;
                            }
                            return acc;
                          }, {} as Record<string, number>);
                          
                          const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
                          
                          if (total === 0) {
                            return <p className="text-sm text-muted-foreground">Sem dados de sentimento</p>;
                          }
                          
                          return (
                            <div className="space-y-2">
                              {Object.entries(sentimentCounts).map(([sentiment, count]) => (
                                <div key={sentiment} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="capitalize">{sentiment}</span>
                                    <span>{((count / total) * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${
                                        sentiment === 'positive' ? 'bg-green-500' :
                                        sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                                      }`}
                                      style={{ width: `${(count / total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p>Selecione uma sessão para ver os detalhes</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployeeCoachPage;
