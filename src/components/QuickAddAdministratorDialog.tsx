import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface QuickAddAdministratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newAdmin: any) => void;
}

export function QuickAddAdministratorDialog({ open, onOpenChange, onSuccess }: QuickAddAdministratorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.cnpj) {
      toast({
        title: 'Atenção',
        description: 'Preencha pelo menos Nome e CNPJ',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('administrators')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Administradora cadastrada com sucesso!',
      });

      setFormData({ name: '', cnpj: '', email: '', phone: '' });
      onSuccess(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding administrator:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar administradora',
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
          <DialogTitle>Cadastro Rápido de Administradora</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos da administradora
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin_name">Nome da Administradora *</Label>
            <Input
              id="admin_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Administradora XYZ Ltda"
              required
            />
          </div>

          <div>
            <Label htmlFor="admin_cnpj">CNPJ *</Label>
            <Input
              id="admin_cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <div>
            <Label htmlFor="admin_email">Email</Label>
            <Input
              id="admin_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@administradora.com"
            />
          </div>

          <div>
            <Label htmlFor="admin_phone">Telefone</Label>
            <Input
              id="admin_phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
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
