import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { CPFInput } from './forms/CPFInput';
import { PhoneInput } from './forms/PhoneInput';

interface Contact {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  active: boolean;
}

interface AdministratorContactsProps {
  administratorId: string;
}

export const AdministratorContacts = ({ administratorId }: AdministratorContactsProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    is_primary: false
  });

  useEffect(() => {
    loadContacts();
  }, [administratorId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('administrator_contacts')
        .select('*')
        .eq('administrator_id', administratorId)
        .eq('active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contatos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('administrator_contacts')
          .update(formData)
          .eq('id', editingContact.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Contato atualizado com sucesso!'
        });
      } else {
        const { error } = await supabase
          .from('administrator_contacts')
          .insert([{
            ...formData,
            administrator_id: administratorId
          }]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Contato adicionado com sucesso!'
        });
      }

      setFormData({
        name: '',
        cpf: '',
        email: '',
        phone: '',
        is_primary: false
      });
      setEditingContact(null);
      setIsDialogOpen(false);
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar contato',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      cpf: contact.cpf || '',
      email: contact.email || '',
      phone: contact.phone || '',
      is_primary: contact.is_primary
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja remover este contato?')) return;

    try {
      const { error } = await supabase
        .from('administrator_contacts')
        .update({ active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato removido com sucesso!'
      });

      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover contato',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Pessoas de Contato
            </CardTitle>
            <CardDescription>
              Gerencie as pessoas de contato desta administradora
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingContact(null);
              setFormData({
                name: '',
                cpf: '',
                email: '',
                phone: '',
                is_primary: false
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Editar Contato' : 'Novo Contato'}
                </DialogTitle>
                <DialogDescription>
                  Adicione ou edite os dados do contato
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Nome *</Label>
                  <Input
                    id="contact-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-cpf">CPF</Label>
                  <CPFInput
                    id="contact-cpf"
                    value={formData.cpf}
                    onChange={(cpf) => setFormData({ ...formData, cpf })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-email">E-mail</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-phone">Telefone</Label>
                    <PhoneInput
                      id="contact-phone"
                      value={formData.phone}
                      onChange={(phone) => setFormData({ ...formData, phone })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is-primary" className="cursor-pointer">
                    Contato Principal
                  </Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingContact ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Carregando...</p>
        ) : contacts.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum contato cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{contact.name}</span>
                    {contact.is_primary && (
                      <Badge variant="default" className="text-xs">Principal</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    {contact.cpf && <p>CPF: {contact.cpf}</p>}
                    {contact.email && <p>E-mail: {contact.email}</p>}
                    {contact.phone && <p>Telefone: {contact.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(contact)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
