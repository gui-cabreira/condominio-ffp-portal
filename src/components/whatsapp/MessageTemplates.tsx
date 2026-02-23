import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Trash2, Loader2, MessageSquare, Mail, Edit2, Copy, Star,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  template_type: string;
  category: string | null;
  subject: string | null;
  content: string;
  variables: string[] | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'cobranca', label: 'Cobrança' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'boas_vindas', label: 'Boas-vindas' },
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'alerta', label: 'Alerta' },
  { value: 'geral', label: 'Geral' },
];

const VARIABLES = [
  { value: '{{nome}}', label: 'Nome do contato' },
  { value: '{{valor}}', label: 'Valor da cobrança' },
  { value: '{{vencimento}}', label: 'Data de vencimento' },
  { value: '{{condominio}}', label: 'Nome do condomínio' },
  { value: '{{unidade}}', label: 'Número da unidade' },
  { value: '{{mes_referencia}}', label: 'Mês de referência' },
  { value: '{{link_boleto}}', label: 'Link do boleto' },
  { value: '{{pix_code}}', label: 'Código PIX' },
];

export function MessageTemplates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({
    name: '',
    template_type: 'whatsapp' as string,
    category: 'cobranca' as string,
    subject: '',
    content: '',
    is_default: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Extract variables from content
      const vars = form.content.match(/\{\{[^}]+\}\}/g) || [];

      if (editingTemplate) {
        const { error } = await supabase
          .from('message_templates')
          .update({
            name: form.name,
            template_type: form.template_type,
            category: form.category,
            subject: form.subject || null,
            content: form.content,
            variables: vars,
            is_default: form.is_default,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_templates')
          .insert({
            name: form.name,
            template_type: form.template_type,
            category: form.category,
            subject: form.subject || null,
            content: form.content,
            variables: vars,
            is_default: form.is_default,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      closeDialog();
      toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!');
    },
    onError: () => toast.error('Erro ao salvar template'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template excluído');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('message_templates').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setForm({ name: '', template_type: 'whatsapp', category: 'cobranca', subject: '', content: '', is_default: false });
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      template_type: t.template_type,
      category: t.category || 'geral',
      subject: t.subject || '',
      content: t.content,
      is_default: t.is_default || false,
    });
    setDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    setForm(prev => ({ ...prev, content: prev.content + variable }));
  };

  const filteredTemplates = templates?.filter(t => {
    if (filterType === 'all') return true;
    return t.template_type === filterType;
  });

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Templates de Mensagens</h2>
            <p className="text-sm text-muted-foreground">
              Mensagens padrão que a IA utiliza para enviar cobranças e notificações
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Template</Label>
                    <Input
                      placeholder="Ex: Cobrança inicial"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.template_type} onValueChange={(v) => setForm(prev => ({ ...prev, template_type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.template_type === 'email' && (
                    <div className="space-y-2">
                      <Label>Assunto do Email</Label>
                      <Input
                        placeholder="Ex: Aviso de cobrança - {{condominio}}"
                        value={form.subject}
                        onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Conteúdo da Mensagem</Label>
                  <Textarea
                    placeholder="Olá {{nome}}, este é um lembrete sobre sua cobrança no valor de {{valor}} com vencimento em {{vencimento}}."
                    value={form.content}
                    onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Variáveis:</span>
                    {VARIABLES.map(v => (
                      <Button
                        key={v.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => insertVariable(v.value)}
                      >
                        {v.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_default}
                    onCheckedChange={(v) => setForm(prev => ({ ...prev, is_default: v }))}
                  />
                  <Label className="cursor-pointer">Template padrão para esta categoria</Label>
                </div>

                <Button
                  className="w-full"
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.name || !form.content || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTemplate ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { value: 'email', label: 'Email', icon: Mail },
          ].map(f => (
            <Button
              key={f.value}
              variant={filterType === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(f.value)}
              className="gap-1"
            >
              {f.icon && <f.icon className="h-3 w-3" />}
              {f.label}
            </Button>
          ))}
        </div>

        {/* Templates list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">Nenhum template cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie templates para a IA usar nas mensagens</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredTemplates?.map((template) => (
              <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {template.template_type === 'whatsapp' ? (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Mail className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium">{template.name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" />
                            Padrão
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 font-mono">
                        {template.content}
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.variables.map((v, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-mono">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={template.is_active ?? true}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: template.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(template)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(template.content);
                          toast.success('Copiado!');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Excluir template?')) deleteMutation.mutate(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
