import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useState } from 'react';
import { 
  MoreVertical, 
  Trash2, 
  Archive, 
  CheckCheck, 
  Eye, 
  EyeOff,
  Download,
  Brain
} from 'lucide-react';

interface ConversationActionsProps {
  conversationId: string;
  instanceId?: string;
  onAction?: () => void;
}

export function ConversationActions({ conversationId, instanceId, onAction }: ConversationActionsProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Arquivar conversa (soft delete de todas as mensagens)
  const archiveConversationMutation = useMutation({
    mutationFn: async () => {
      // 1. Marcar todas as mensagens como arquivadas (mas manter para aprendizado)
      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .update({ archived_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('archived_at', null);

      if (messagesError) throw messagesError;

      // 2. Atualizar status da conversa
      const { error: convError } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'archived' })
        .eq('id', conversationId);

      if (convError) throw convError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
      setArchiveDialogOpen(false);
      toast.success('Conversa arquivada! As mensagens foram salvas para aprendizado.');
      onAction?.();
    },
    onError: () => {
      toast.error('Erro ao arquivar conversa');
    },
  });

  // Apagar conversa completamente (soft delete)
  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      // 1. Soft delete das mensagens
      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('deleted_at', null);

      if (messagesError) throw messagesError;

      // 2. Marcar conversa como deletada
      const { error: convError } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'deleted' })
        .eq('id', conversationId);

      if (convError) throw convError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      setDeleteDialogOpen(false);
      toast.success('Conversa apagada! As mensagens foram salvas para consulta.');
      onAction?.();
    },
    onError: () => {
      toast.error('Erro ao apagar conversa');
    },
  });

  // Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Marcada como lida');
    },
  });

  // Marcar como não lida
  const markAsUnreadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 1 })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('Marcada como não lida');
    },
  });

  // Usar conversa para treinamento
  const useForTrainingMutation = useMutation({
    mutationFn: async () => {
      // Marcar mensagens para treinamento
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ used_for_training: true })
        .eq('conversation_id', conversationId);
      if (error) throw error;

      // Invocar função de aprendizado
      if (instanceId) {
        await supabase.functions.invoke('qdrant-knowledge', {
          body: {
            action: 'learn_from_conversation',
            conversationId,
            instanceId,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success('Conversa adicionada ao treinamento da IA');
    },
    onError: () => {
      toast.error('Erro ao adicionar ao treinamento');
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => markAsReadMutation.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar como lida
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => markAsUnreadMutation.mutate()}>
            <Eye className="h-4 w-4 mr-2" />
            Marcar como não lida
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useForTrainingMutation.mutate()}>
            <Brain className="h-4 w-4 mr-2" />
            Usar para treinamento IA
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>
            <Archive className="h-4 w-4 mr-2" />
            Arquivar conversa
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Apagar conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Arquivar */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              As mensagens serão removidas da visualização mas permanecerão salvas 
              para consulta e aprendizado da IA. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveConversationMutation.mutate()}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Deletar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Conversa</AlertDialogTitle>
            <AlertDialogDescription>
              As mensagens serão removidas da visualização. Elas permanecerão 
              salvas em banco para consulta histórica. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConversationMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Componente para ações em mensagem individual
interface MessageActionsProps {
  messageId: string;
  conversationId: string;
  instanceId?: string;
  instanceApiKey?: string;
  remoteJid?: string;
}

export function MessageActions({ 
  messageId, 
  conversationId, 
  instanceId,
  instanceApiKey,
  remoteJid 
}: MessageActionsProps) {
  const queryClient = useQueryClient();

  // Apagar mensagem (soft delete)
  const deleteMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
      toast.success('Mensagem apagada');
    },
  });

  // Reagir a mensagem
  const reactToMessageMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (!instanceId || !instanceApiKey || !remoteJid) {
        throw new Error('Dados da instância incompletos');
      }

      const response = await fetch(`https://appnow.uazapi.com/message/sendReaction/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instanceApiKey,
        },
        body: JSON.stringify({
          key: { remoteJid, id: messageId },
          reaction: emoji,
        }),
      });

      if (!response.ok) throw new Error('Falha ao enviar reação');
    },
    onSuccess: () => {
      toast.success('Reação enviada');
    },
    onError: () => {
      toast.error('Erro ao enviar reação');
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => reactToMessageMutation.mutate('👍')}>
          👍 Curtir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => reactToMessageMutation.mutate('❤️')}>
          ❤️ Amei
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => reactToMessageMutation.mutate('😂')}>
          😂 Haha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => deleteMessageMutation.mutate()}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Apagar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
