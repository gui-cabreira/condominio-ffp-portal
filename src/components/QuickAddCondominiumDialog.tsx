import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface QuickAddCondominiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administratorId: string;
  onSuccess: (newCondo: any) => void;
}

export function QuickAddCondominiumDialog({ 
  open, 
  onOpenChange, 
  administratorId,
  onSuccess 
}: QuickAddCondominiumDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_units: 0,
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: 'Atenção',
        description: 'Digite o nome do condomínio',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('condominiums')
        .insert([{
          ...formData,
          administrator_id: administratorId,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Condomínio cadastrado com sucesso!',
      });

      setFormData({ name: '', address: '', total_units: 0 });
      onSuccess(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding condominium:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar condomínio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Condomínio</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos do condomínio
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="condo_name">Nome do Condomínio *</Label>
            <Input
              id="condo_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Residencial Jardim das Flores"
              required
            />
          </div>

          <div>
            <Label htmlFor="condo_address">Endereço</Label>
            <Input
              id="condo_address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div>
            <Label htmlFor="condo_units">Total de Unidades</Label>
            <Input
              id="condo_units"
              type="number"
              value={formData.total_units}
              onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
