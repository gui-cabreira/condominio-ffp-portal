import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  MessageSquare, 
  Brain, 
  Trash2, 
  Upload,
  BookOpen,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';

interface KnowledgeBaseProps {
  instanceId: string;
  administratorId?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  source_type: string;
  is_vectorized: boolean;
  created_at: string;
}

export function KnowledgeBase({ instanceId, administratorId }: KnowledgeBaseProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', content: '', type: 'faq' as const });

  // Buscar itens da base de conhecimento
  const { data: knowledgeItems, isLoading } = useQuery({
    queryKey: ['knowledge-base', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as KnowledgeItem[];
    },
  });

  // Buscar histórico de aprendizado
  const { data: learningHistory } = useQuery({
    queryKey: ['learning-history', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_learning_history')
        .select('*')
        .eq('instance_id', instanceId)
        .order('learned_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Adicionar novo conhecimento
  const addKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          instance_id: instanceId,
          administrator_id: administratorId,
          title: newItem.title,
          content: newItem.content,
          source_type: newItem.type,
        });
      if (error) throw error;

      // Vetorizar no Qdrant
      try {
        await supabase.functions.invoke('qdrant-knowledge', {
          body: {
            action: 'add',
            instanceId,
            title: newItem.title,
            content: newItem.content,
            type: newItem.type,
          },
        });
      } catch (e) {
        console.error('Erro ao vetorizar:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', instanceId] });
      setAddDialogOpen(false);
      setNewItem({ title: '', content: '', type: 'faq' });
      toast.success('Conhecimento adicionado!');
    },
    onError: () => {
      toast.error('Erro ao adicionar conhecimento');
    },
  });

  // Remover conhecimento
  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', instanceId] });
      toast.success('Item removido');
    },
  });

  // Aprovar aprendizado
  const approveLearningMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_learning_history')
        .update({ is_approved: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-history', instanceId] });
      toast.success('Aprendizado aprovado!');
    },
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'qa': return <MessageSquare className="h-4 w-4" />;
      case 'conversation': return <Brain className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case 'document': return 'Documento';
      case 'qa': return 'P&R';
      case 'conversation': return 'Conversa';
      case 'faq': return 'FAQ';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="knowledge" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="learning">Aprendizado</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Tab: Base de Conhecimento */}
        <TabsContent value="knowledge" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Perguntas e Respostas</h3>
              <p className="text-sm text-muted-foreground">
                Adicione conhecimento para a IA responder melhor
              </p>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Conhecimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título / Pergunta</Label>
                    <Input
                      placeholder="Ex: Como gerar segunda via do boleto?"
                      value={newItem.title}
                      onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resposta / Conteúdo</Label>
                    <Textarea
                      placeholder="Ex: Para gerar segunda via, acesse o portal do condômino..."
                      value={newItem.content}
                      onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                      rows={5}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => addKnowledgeMutation.mutate()}
                    disabled={!newItem.title || !newItem.content || addKnowledgeMutation.isPending}
                  >
                    {addKnowledgeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : knowledgeItems?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum conhecimento cadastrado ainda.
                  <br />
                  Adicione perguntas e respostas para a IA.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {knowledgeItems?.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSourceIcon(item.source_type)}
                          <Badge variant="outline" className="text-xs">
                            {getSourceLabel(item.source_type)}
                          </Badge>
                          {item.is_vectorized && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Vetorizado
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {item.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteKnowledgeMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Aprendizado */}
        <TabsContent value="learning" className="space-y-4">
          <div>
            <h3 className="font-medium">Aprendizado Automático</h3>
            <p className="text-sm text-muted-foreground">
              Conversas que a IA aprendeu automaticamente
            </p>
          </div>

          {learningHistory?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum aprendizado registrado ainda.
                  <br />
                  A IA aprenderá com as conversas automaticamente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {learningHistory?.map((item: any) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={item.is_approved ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {item.is_approved ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprovado
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </>
                            )}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Score: {(item.quality_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Pergunta:</span>
                            <p className="text-sm">{item.question}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Resposta:</span>
                            <p className="text-sm">{item.answer}</p>
                          </div>
                        </div>
                      </div>
                      {!item.is_approved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => approveLearningMutation.mutate(item.id)}
                        >
                          Aprovar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Upload */}
        <TabsContent value="upload" className="space-y-4">
          <div>
            <h3 className="font-medium">Upload de Documentos</h3>
            <p className="text-sm text-muted-foreground">
              Faça upload de PDFs, TXTs ou outros documentos
            </p>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <Button variant="outline">
                  Selecionar Arquivos
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Formatos suportados: PDF, TXT, DOCX (máx. 10MB)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
