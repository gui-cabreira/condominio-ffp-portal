import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, DollarSign, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

interface ConfirmPaymentDialogProps {
  chargeId: string;
  chargeAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentConfirmed: () => void;
}

export function ConfirmPaymentDialog({ 
  chargeId, 
  chargeAmount, 
  open, 
  onOpenChange,
  onPaymentConfirmed 
}: ConfirmPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidAmount, setPaidAmount] = useState(chargeAmount.toString());
  const [notes, setNotes] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Atualizar cobrança para pago
      const { error: updateError } = await supabase
        .from('charges')
        .update({ 
          status: 'paid',
          payment_date: paymentDate
        })
        .eq('id', chargeId);

      if (updateError) throw updateError;

      // Registrar no timeline
      await supabase.from('charge_timeline').insert({
        charge_id: chargeId,
        event_type: 'paid',
        event_data: { 
          description: 'Baixa manual - pagamento confirmado',
          payment_date: paymentDate,
          paid_amount: parseFloat(paidAmount),
          notes: notes || undefined
        }
      });

      toast.success('Pagamento confirmado com sucesso!');
      onPaymentConfirmed();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao confirmar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirmar Pagamento (Baixa)
          </DialogTitle>
          <DialogDescription>
            Registre a confirmação do pagamento desta cobrança.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Valor da cobrança:</span>
              <span className="font-bold text-primary">{formatCurrency(chargeAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data do Pagamento
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Pago
            </Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagamento via PIX, comprovante anexado ao email..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Confirmando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
