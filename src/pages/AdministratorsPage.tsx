import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, Edit, Trash2, Search, Mail, Phone, FileText, Link as LinkIcon, Key, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CNPJLookup } from '@/components/forms/CNPJLookup';
import { AdministratorContacts } from '@/components/AdministratorContacts';
import { ContactSelector } from '@/components/ContactSelector';

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
  fantasy_name: string | null;
  legal_name: string | null;
  legal_nature: string | null;
  opening_date: string | null;
  status: string | null;
  size: string | null;
  capital: string | null;
  main_activity: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  portal_url: string | null;
  portal_username: string | null;
  portal_password: string | null;
  management_system_id: string | null;
};

type ManagementSystem = {
  id: string;
  name: string;
  description: string | null;
};

const AdministratorsPage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnpj: '',
    address: '',
    contact_person: '',
    fantasy_name: '',
    legal_name: '',
    legal_nature: '',
    opening_date: '',
    status: '',
    size: '',
    capital: '',
    main_activity: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    portal_url: '',
    portal_username: '',
    portal_password: '',
    management_system_id: ''
  });

  // Buscar sistemas de gestão
  const { data: managementSystems } = useQuery({
    queryKey: ['management-systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('management_systems')
        .select('id, name, description')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ManagementSystem[];
    },
  });

  // Buscar administradoras
  const { data: administrators, isLoading, refetch } = useQuery({
    queryKey: ['administrators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .eq('active', true)
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
        fantasy_name: '',
        legal_name: '',
        legal_nature: '',
        opening_date: '',
        status: '',
        size: '',
        capital: '',
        main_activity: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        portal_url: '',
        portal_username: '',
        portal_password: '',
        management_system_id: ''
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
      fantasy_name: admin.fantasy_name || '',
      legal_name: admin.legal_name || '',
      legal_nature: admin.legal_nature || '',
      opening_date: admin.opening_date || '',
      status: admin.status || '',
      size: admin.size || '',
      capital: admin.capital || '',
      main_activity: admin.main_activity || '',
      street: admin.street || '',
      number: admin.number || '',
      complement: admin.complement || '',
      neighborhood: admin.neighborhood || '',
      city: admin.city || '',
      state: admin.state || '',
      zip_code: admin.zip_code || '',
      portal_url: admin.portal_url || '',
      portal_username: admin.portal_username || '',
      portal_password: admin.portal_password || '',
      management_system_id: admin.management_system_id || ''
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
      fantasy_name: '',
      legal_name: '',
      legal_nature: '',
      opening_date: '',
      status: '',
      size: '',
      capital: '',
      main_activity: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      portal_url: '',
      portal_username: '',
      portal_password: '',
      management_system_id: ''
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        name: data.legalName || data.name || formData.name,
                        email: data.email || formData.email,
                        phone: data.phone || formData.phone,
                        cnpj: data.cnpj || formData.cnpj,
                        address: data.address.fullAddress || formData.address,
                        fantasy_name: data.fantasyName || '',
                        legal_name: data.legalName || '',
                        legal_nature: data.legalNature || '',
                        opening_date: data.openingDate || '',
                        status: data.status || '',
                        size: data.size || '',
                        capital: data.capital || '',
                        main_activity: data.activity || '',
                        street: data.address.street || '',
                        number: data.address.number || '',
                        complement: data.address.complement || '',
                        neighborhood: data.address.neighborhood || '',
                        city: data.address.city || '',
                        state: data.address.state || '',
                        zip_code: data.address.zipCode || '',
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

                <div className="col-span-2">
                  <Label htmlFor="management_system">Sistema de Gestão *</Label>
                  <Select
                    value={formData.management_system_id}
                    onValueChange={(value) => setFormData({ ...formData, management_system_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sistema usado" />
                    </SelectTrigger>
                    <SelectContent>
                      {managementSystems?.map((system) => (
                        <SelectItem key={system.id} value={system.id}>
                          {system.name}
                          {system.description && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {system.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <ContactSelector
                    administratorId={editingAdmin?.id}
                    value={formData.contact_person}
                    onChange={(contactId, contactName) => {
                      setFormData({ ...formData, contact_person: contactName });
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Acesso ao Portal de Boletos
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="portal_url">Link do Portal</Label>
                      <Input
                        id="portal_url"
                        value={formData.portal_url}
                        onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
                        placeholder="https://portal.administradora.com.br"
                        type="url"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="portal_username">Usuário</Label>
                        <Input
                          id="portal_username"
                          value={formData.portal_username}
                          onChange={(e) => setFormData({ ...formData, portal_username: e.target.value })}
                          placeholder="usuário"
                        />
                      </div>

                      <div>
                        <Label htmlFor="portal_password">Senha</Label>
                        <Input
                          id="portal_password"
                          type="password"
                          value={formData.portal_password}
                          onChange={(e) => setFormData({ ...formData, portal_password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
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
            <Card key={admin.id} className="flex flex-col h-full min-h-[320px]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <CardTitle className="text-base flex items-start gap-2 break-words">
                      <Building2 className="w-5 h-5 text-ffp-navy shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{admin.name}</span>
                    </CardTitle>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setViewDialogOpen(true);
                      }}
                      className="h-8 w-8"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(admin)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(admin.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                {admin.fantasy_name && (
                  <div className="text-sm min-w-0">
                    <span className="text-muted-foreground">Nome Fantasia:</span>
                    <p className="font-medium truncate">{admin.fantasy_name}</p>
                  </div>
                )}
                
                {admin.cnpj && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{admin.cnpj}</span>
                  </div>
                )}

                {admin.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate" title={admin.email}>{admin.email}</span>
                  </div>
                )}
                
                {admin.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="truncate">{admin.phone}</span>
                  </div>
                )}

                {admin.portal_url && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 border-t pt-2 min-w-0">
                    <LinkIcon className="w-4 h-4 shrink-0" />
                    <a 
                      href={admin.portal_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="truncate hover:underline text-blue-600"
                      title={admin.portal_url}
                    >
                      Portal de Boletos
                    </a>
                  </div>
                )}

                <div className="border-t pt-3 mt-auto">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes Completos
                  </Button>
                </div>
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

      {/* Dialog de Visualização Completa */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {selectedAdmin?.name}
            </DialogTitle>
            <DialogDescription>
              Dados completos da administradora
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="contacts">Contatos</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dados Cadastrais</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    {selectedAdmin.legal_name && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Razão Social:</span>
                        <p className="font-medium">{selectedAdmin.legal_name}</p>
                      </div>
                    )}
                    {selectedAdmin.fantasy_name && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Nome Fantasia:</span>
                        <p className="font-medium">{selectedAdmin.fantasy_name}</p>
                      </div>
                    )}
                    {selectedAdmin.cnpj && (
                      <div>
                        <span className="text-muted-foreground">CNPJ:</span>
                        <p className="font-medium">{selectedAdmin.cnpj}</p>
                      </div>
                    )}
                    {selectedAdmin.status && (
                      <div>
                        <span className="text-muted-foreground">Situação:</span>
                        <Badge variant={selectedAdmin.status === 'ATIVA' ? 'default' : 'secondary'}>
                          {selectedAdmin.status}
                        </Badge>
                      </div>
                    )}
                    {selectedAdmin.opening_date && (
                      <div>
                        <span className="text-muted-foreground">Data de Abertura:</span>
                        <p className="font-medium">{selectedAdmin.opening_date}</p>
                      </div>
                    )}
                    {selectedAdmin.size && (
                      <div>
                        <span className="text-muted-foreground">Porte:</span>
                        <p className="font-medium">{selectedAdmin.size}</p>
                      </div>
                    )}
                    {selectedAdmin.legal_nature && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Natureza Jurídica:</span>
                        <p className="font-medium text-xs">{selectedAdmin.legal_nature}</p>
                      </div>
                    )}
                    {selectedAdmin.capital && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Capital Social:</span>
                        <p className="font-medium">R$ {parseFloat(selectedAdmin.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {selectedAdmin.main_activity && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Atividade Principal:</span>
                        <p className="font-medium text-xs">{selectedAdmin.main_activity}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    {selectedAdmin.email && (
                      <div>
                        <span className="text-muted-foreground">E-mail:</span>
                        <p className="font-medium">{selectedAdmin.email}</p>
                      </div>
                    )}
                    {selectedAdmin.phone && (
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>
                        <p className="font-medium">{selectedAdmin.phone}</p>
                      </div>
                    )}
                    {selectedAdmin.address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Endereço:</span>
                        <p className="font-medium">{selectedAdmin.address}</p>
                      </div>
                    )}
                    {(selectedAdmin.city && selectedAdmin.state) && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Cidade/Estado:</span>
                        <p className="font-medium">{selectedAdmin.city}/{selectedAdmin.state}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(selectedAdmin.portal_url || selectedAdmin.portal_username) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Acesso ao Portal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {selectedAdmin.portal_url && (
                        <div>
                          <span className="text-muted-foreground">Link:</span>
                          <p>
                            <a 
                              href={selectedAdmin.portal_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                            >
                              {selectedAdmin.portal_url}
                              <LinkIcon className="w-3 h-3" />
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedAdmin.portal_username && (
                        <div>
                          <span className="text-muted-foreground">Usuário:</span>
                          <p className="font-medium font-mono">{selectedAdmin.portal_username}</p>
                        </div>
                      )}
                      {selectedAdmin.portal_password && (
                        <div>
                          <span className="text-muted-foreground">Senha:</span>
                          <p className="font-medium font-mono">••••••••</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="contacts">
                <AdministratorContacts administratorId={selectedAdmin.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdministratorsPage;
