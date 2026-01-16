import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileImage, FileText, CheckCircle, XCircle, Clock, 
  ExternalLink, Eye, ThumbsUp, ThumbsDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface PaymentProof {
  id: string;
  charge_id: string;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  status: string | null;
  created_at: string;
  analyzed_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
}

interface PaymentProofsListProps {
  chargeId: string;
  onPaymentConfirmed?: () => void;
}

export function PaymentProofsList({ chargeId, onPaymentConfirmed }: PaymentProofsListProps) {
  const queryClient = useQueryClient();
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: proofs, isLoading } = useQuery({
    queryKey: ['payment-proofs', chargeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('charge_id', chargeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentProof[];
    },
  });

  const updateProofMutation = useMutation({
    mutationFn: async ({ proofId, status, rejectionReason }: { 
      proofId: string; 
      status: 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      const updates: any = {
        status,
        analyzed_at: new Date().toISOString(),
      };
      
      if (rejectionReason) {
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('payment_proofs')
        .update(updates)
        .eq('id', proofId);

      if (error) throw error;

      // Se aprovado, atualizar cobrança para pago
      if (status === 'approved') {
        await supabase
          .from('charges')
          .update({ 
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', chargeId);

        // Registrar no timeline
        await supabase.from('charge_timeline').insert({
          charge_id: chargeId,
          event_type: 'paid',
          event_data: { 
            description: 'Pagamento confirmado via comprovante',
            proof_id: proofId 
          }
        });
      } else {
        // Registrar rejeição no timeline
        await supabase.from('charge_timeline').insert({
          charge_id: chargeId,
          event_type: 'rejected',
          event_data: { 
            description: `Comprovante rejeitado: ${rejectionReason}`,
            proof_id: proofId 
          }
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-proofs', chargeId] });
      queryClient.invalidateQueries({ queryKey: ['charge-timeline', chargeId] });
      
      if (variables.status === 'approved') {
        toast.success('Pagamento confirmado com sucesso!');
        onPaymentConfirmed?.();
      } else {
        toast.info('Comprovante rejeitado');
      }
      
      setSelectedProof(null);
      setActionType(null);
      setRejectionReason('');
    },
    onError: (error) => {
      console.error('Erro ao atualizar comprovante:', error);
      toast.error('Erro ao processar comprovante');
    }
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.includes('image')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-orange-500" />;
  };

  const handleAction = (proof: PaymentProof, action: 'approve' | 'reject') => {
    setSelectedProof(proof);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedProof || !actionType) return;
    
    updateProofMutation.mutate({
      proofId: selectedProof.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      rejectionReason: actionType === 'reject' ? rejectionReason : undefined
    });
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando comprovantes...</div>;
  }

  if (!proofs || proofs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum comprovante recebido</p>
        <p className="text-xs mt-1">Comprovantes enviados via WhatsApp aparecerão aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {proofs.map((proof) => (
          <Card key={proof.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getFileIcon(proof.file_type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(proof.status)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(proof.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate">
                    {proof.file_name || 'Comprovante'}
                  </p>
                  
                  {proof.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">
                      Motivo: {proof.rejection_reason}
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(proof.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {proof.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleAction(proof, 'approve')}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleAction(proof, 'reject')}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!selectedProof && !!actionType} onOpenChange={() => {
        setSelectedProof(null);
        setActionType(null);
        setRejectionReason('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Confirmar Pagamento' : 'Rejeitar Comprovante'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' 
                ? 'Ao aprovar este comprovante, a cobrança será marcada como PAGA. Deseja continuar?'
                : 'Informe o motivo da rejeição do comprovante:'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {actionType === 'reject' && (
            <Textarea
              placeholder="Ex: Comprovante ilegível, valor não confere, etc."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={actionType === 'reject' && !rejectionReason}
            >
              {actionType === 'approve' ? 'Confirmar Pagamento' : 'Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
