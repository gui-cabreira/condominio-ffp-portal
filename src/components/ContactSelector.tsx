import { useState, useEffect } from 'react';
import { Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CPFInput } from './forms/CPFInput';
import { PhoneInput } from './forms/PhoneInput';

interface Contact {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
}

interface ContactSelectorProps {
  administratorId?: string;
  value?: string;
  onChange: (contactId: string, contactName: string) => void;
}

export const ContactSelector = ({ administratorId, value, onChange }: ContactSelectorProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    is_primary: false
  });

  useEffect(() => {
    if (administratorId) {
      loadContacts();
    }
  }, [administratorId]);

  const loadContacts = async () => {
    if (!administratorId) return;

    try {
      const { data, error } = await supabase
        .from('administrator_contacts')
        .select('*')
        .eq('administrator_id', administratorId)
        .eq('active', true)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!administratorId) {
      toast({
        title: 'Erro',
        description: 'Salve a administradora primeiro para adicionar contatos',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('administrator_contacts')
        .insert([{
          ...formData,
          administrator_id: administratorId
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato adicionado com sucesso!'
      });

      setFormData({
        name: '',
        cpf: '',
        email: '',
        phone: '',
        is_primary: false
      });
      
      setIsDialogOpen(false);
      loadContacts();
      
      if (data) {
        onChange(data.id, data.name);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar contato',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Pessoa de Contato</Label>
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={(contactId) => {
            const contact = contacts.find(c => c.id === contactId);
            if (contact) {
              onChange(contactId, contact.name);
            }
          }}
          disabled={!administratorId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={administratorId ? "Selecione um contato" : "Salve a administradora primeiro"} />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{contact.name}</span>
                  {contact.phone && <span className="text-xs text-muted-foreground">• {contact.phone}</span>}
                </div>
              </SelectItem>
            ))}
            {contacts.length === 0 && (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                Nenhum contato cadastrado
              </div>
            )}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsDialogOpen(true)}
            disabled={!administratorId}
            title={!administratorId ? "Salve a administradora primeiro" : "Adicionar novo contato"}
          >
            <Plus className="w-4 h-4" />
          </Button>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Contato</DialogTitle>
              <DialogDescription>
                Adicione uma nova pessoa de contato
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <Label htmlFor="new-contact-name">Nome *</Label>
                <Input
                  id="new-contact-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label htmlFor="new-contact-cpf">CPF</Label>
                <CPFInput
                  id="new-contact-cpf"
                  value={formData.cpf}
                  onChange={(cpf) => setFormData({ ...formData, cpf })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-contact-email">E-mail</Label>
                  <Input
                    id="new-contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="new-contact-phone">Telefone</Label>
                  <PhoneInput
                    id="new-contact-phone"
                    value={formData.phone}
                    onChange={(phone) => setFormData({ ...formData, phone })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-is-primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="new-is-primary" className="cursor-pointer">
                  Contato Principal
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {!administratorId && (
        <p className="text-xs text-muted-foreground">
          Salve a administradora primeiro para gerenciar contatos
        </p>
      )}
    </div>
  );
};
