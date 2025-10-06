import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, Edit, Trash2, Search, Mail, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CNPJLookup } from '@/components/forms/CNPJLookup';

type Administrator = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  contact_person: string | null;
  active: boolean;
  created_at: string;
};

const AdministratorsPage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnpj: '',
    address: '',
    contact_person: '',
  });

  // Buscar administradoras
  const { data: administrators, isLoading, refetch } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Administrator[];
    },
  });

  const filteredAdministrators = administrators?.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.cnpj?.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAdmin) {
        // Atualizar
        const { error } = await supabase
          .from('administrators')
          .update(formData)
          .eq('id', editingAdmin.id);

        if (error) throw error;

        toast({
          title: 'Administradora atualizada',
          description: 'Os dados foram atualizados com sucesso.',
        });
      } else {
        // Criar
        const { error } = await supabase
          .from('administrators')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Administradora cadastrada',
          description: 'A administradora foi cadastrada com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        cnpj: '',
        address: '',
        contact_person: '',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (admin: Administrator) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      cnpj: admin.cnpj || '',
      address: admin.address || '',
      contact_person: admin.contact_person || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar esta administradora?')) return;

    try {
      const { error } = await supabase
        .from('administrators')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Administradora desativada',
        description: 'A administradora foi desativada com sucesso.',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openNewDialog = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cnpj: '',
      address: '',
      contact_person: '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ffp-navy flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Administradoras
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie as administradoras de condomínios
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ffp-gold hover:bg-ffp-gold-dark text-ffp-navy" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Administradora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? 'Editar Administradora' : 'Nova Administradora'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da administradora de condomínios
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <CNPJLookup
                    initialCNPJ={formData.cnpj}
                    onDataFound={(data) => {
                      setFormData({
                        ...formData,
                        name: data.legalName || formData.name,
                        email: data.email || formData.email,
                        phone: data.phone || formData.phone,
                        cnpj: data.cnpj || formData.cnpj,
                        address: data.address.fullAddress || formData.address,
                      });
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="name">Nome da Administradora *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Administradora XYZ Ltda"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@administradora.com.br"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_person">Pessoa de Contato</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-ffp-navy hover:bg-ffp-navy-dark">
                  {editingAdmin ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, e-mail ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Administradoras */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : filteredAdministrators && filteredAdministrators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdministrators.map((admin) => (
            <Card key={admin.id} className={admin.active ? '' : 'opacity-50'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-ffp-navy" />
                      {admin.name}
                    </CardTitle>
                    {!admin.active && (
                      <Badge variant="secondary" className="mt-2">Inativa</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(admin)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {admin.active && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(admin.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {admin.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{admin.email}</span>
                  </div>
                )}
                {admin.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{admin.phone}</span>
                  </div>
                )}
                {admin.cnpj && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{admin.cnpj}</span>
                  </div>
                )}
                {admin.contact_person && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Contato:</span> {admin.contact_person}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {searchTerm ? 'Nenhuma administradora encontrada' : 'Nenhuma administradora cadastrada'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdministratorsPage;
