import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, Edit, Trash2, Search, Mail, Phone, FileText, Link as LinkIcon, Key, Eye, MoreVertical, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CNPJLookup } from '@/components/forms/CNPJLookup';
import { AdministratorContacts } from '@/components/AdministratorContacts';
import { ContactSelector } from '@/components/ContactSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

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

const emptyFormData = {
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
};

const AdministratorsPage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    try {
      // Converter strings vazias para null em campos UUID e opcionais
      const dataToSave = {
        ...formData,
        management_system_id: formData.management_system_id || null,
        phone: formData.phone || null,
        cnpj: formData.cnpj || null,
        address: formData.address || null,
        contact_person: formData.contact_person || null,
        fantasy_name: formData.fantasy_name || null,
        legal_name: formData.legal_name || null,
        legal_nature: formData.legal_nature || null,
        opening_date: formData.opening_date || null,
        status: formData.status || null,
        size: formData.size || null,
        capital: formData.capital || null,
        main_activity: formData.main_activity || null,
        street: formData.street || null,
        number: formData.number || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        portal_url: formData.portal_url || null,
        portal_username: formData.portal_username || null,
        portal_password: formData.portal_password || null,
      };

      if (editingAdmin) {
        const { error } = await supabase
          .from('administrators')
          .update(dataToSave)
          .eq('id', editingAdmin.id);
        if (error) throw error;
        toast({ title: 'Administradora atualizada', description: 'Os dados foram atualizados com sucesso.' });
      } else {
        const { error } = await supabase.from('administrators').insert([dataToSave]);
        if (error) throw error;
        toast({ title: 'Administradora cadastrada', description: 'A administradora foi cadastrada com sucesso.' });
      }
      closeForm();
      refetch();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
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
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar esta administradora?')) return;
    try {
      const { error } = await supabase.from('administrators').update({ active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Administradora desativada', description: 'A administradora foi desativada com sucesso.' });
      refetch();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const openNewForm = () => {
    setEditingAdmin(null);
    setFormData(emptyFormData);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAdmin(null);
    setFormData(emptyFormData);
  };

  const openView = (admin: Administrator) => {
    setSelectedAdmin(admin);
    setViewOpen(true);
  };

  // Form Content Component
  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="name">Nome da Administradora *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Administradora XYZ Ltda"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@admin.com.br"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="management_system">Sistema de Gestão</Label>
          <Select
            value={formData.management_system_id}
            onValueChange={(value) => setFormData({ ...formData, management_system_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sistema" />
            </SelectTrigger>
            <SelectContent>
              {managementSystems?.map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <ContactSelector
            administratorId={editingAdmin?.id}
            value={formData.contact_person}
            onChange={(_, contactName) => {
              setFormData({ ...formData, contact_person: contactName });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Endereço completo"
            rows={2}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Acesso ao Portal de Boletos
          </h4>
          
          <div className="space-y-2">
            <Label htmlFor="portal_url">Link do Portal</Label>
            <Input
              id="portal_url"
              value={formData.portal_url}
              onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
              placeholder="https://portal.admin.com.br"
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="portal_username">Usuário</Label>
              <Input
                id="portal_username"
                value={formData.portal_username}
                onChange={(e) => setFormData({ ...formData, portal_username: e.target.value })}
                placeholder="usuário"
              />
            </div>
            <div className="space-y-2">
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

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeForm} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {editingAdmin ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );

  // View Content Component
  const ViewContent = () => {
    if (!selectedAdmin) return null;
    
    return (
      <Tabs defaultValue="info" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          {/* Dados Cadastrais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedAdmin.legal_name && (
                <div>
                  <span className="text-muted-foreground text-xs">Razão Social</span>
                  <p className="font-medium">{selectedAdmin.legal_name}</p>
                </div>
              )}
              {selectedAdmin.fantasy_name && (
                <div>
                  <span className="text-muted-foreground text-xs">Nome Fantasia</span>
                  <p className="font-medium">{selectedAdmin.fantasy_name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {selectedAdmin.cnpj && (
                  <div>
                    <span className="text-muted-foreground text-xs">CNPJ</span>
                    <p className="font-medium">{selectedAdmin.cnpj}</p>
                  </div>
                )}
                {selectedAdmin.status && (
                  <div>
                    <span className="text-muted-foreground text-xs">Situação</span>
                    <div className="mt-0.5">
                      <Badge variant={selectedAdmin.status === 'ATIVA' ? 'default' : 'secondary'} className="text-xs">
                        {selectedAdmin.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              {selectedAdmin.main_activity && (
                <div>
                  <span className="text-muted-foreground text-xs">Atividade Principal</span>
                  <p className="font-medium text-xs">{selectedAdmin.main_activity}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedAdmin.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${selectedAdmin.email}`} className="text-primary hover:underline">
                    {selectedAdmin.email}
                  </a>
                </div>
              )}
              {selectedAdmin.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${selectedAdmin.phone}`} className="hover:underline">
                    {selectedAdmin.phone}
                  </a>
                </div>
              )}
              {selectedAdmin.address && (
                <div>
                  <span className="text-muted-foreground text-xs">Endereço</span>
                  <p className="font-medium">{selectedAdmin.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portal */}
          {(selectedAdmin.portal_url || selectedAdmin.portal_username) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Acesso ao Portal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {selectedAdmin.portal_url && (
                  <div>
                    <span className="text-muted-foreground text-xs">Link</span>
                    <p>
                      <a 
                        href={selectedAdmin.portal_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        Acessar Portal
                        <LinkIcon className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                )}
                {selectedAdmin.portal_username && (
                  <div>
                    <span className="text-muted-foreground text-xs">Usuário</span>
                    <p className="font-mono text-sm">{selectedAdmin.portal_username}</p>
                  </div>
                )}
                {selectedAdmin.portal_password && (
                  <div>
                    <span className="text-muted-foreground text-xs">Senha</span>
                    <p className="font-mono text-sm">••••••••</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <AdministratorContacts administratorId={selectedAdmin.id} />
        </TabsContent>
      </Tabs>
    );
  };

  // Admin Card for Mobile (list item style)
  const AdminListItem = ({ admin }: { admin: Administrator }) => (
    <div
      className="flex items-center gap-3 p-4 bg-card rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer active:bg-accent"
      onClick={() => openView(admin)}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{admin.name}</p>
        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
        {admin.cnpj && (
          <p className="text-xs text-muted-foreground">{admin.cnpj}</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openView(admin); }}>
            <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(admin); }}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); handleDelete(admin.id); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Desativar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  // Admin Card for Desktop (grid style)
  const AdminCard = ({ admin }: { admin: Administrator }) => (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium line-clamp-2">{admin.name}</CardTitle>
              {admin.fantasy_name && (
                <p className="text-xs text-muted-foreground truncate">{admin.fantasy_name}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => openView(admin)}>
                <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(admin)}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(admin.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 text-sm">
        {admin.cnpj && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{admin.cnpj}</span>
          </div>
        )}
        {admin.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{admin.email}</span>
          </div>
        )}
        {admin.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <span>{admin.phone}</span>
          </div>
        )}
        {admin.portal_url && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <LinkIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
            <a href={admin.portal_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
              Portal de Boletos
            </a>
          </div>
        )}
      </CardContent>
      <div className="p-4 pt-0">
        <Button variant="outline" size="sm" className="w-full" onClick={() => openView(admin)}>
          <Eye className="w-4 h-4 mr-2" />
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );

  return (
    <PageContainer>
      <PageHeader
        icon={Building2}
        title="Administradoras"
        description={`${filteredAdministrators?.length || 0} cadastradas`}
        actions={
          isMobile ? (
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button size="sm" onClick={openNewForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] rounded-t-xl">
                <SheetHeader>
                  <SheetTitle>{editingAdmin ? 'Editar Administradora' : 'Nova Administradora'}</SheetTitle>
                  <SheetDescription>Preencha os dados da administradora</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(90vh-100px)] pr-4 mt-4">
                  <FormContent />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          ) : (
            <>
              <Button onClick={openNewForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Administradora
              </Button>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingAdmin ? 'Editar Administradora' : 'Nova Administradora'}</DialogTitle>
                    <DialogDescription>Preencha os dados da administradora</DialogDescription>
                  </DialogHeader>
                  <FormContent />
                </DialogContent>
              </Dialog>
            </>
          )
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAdministrators && filteredAdministrators.length > 0 ? (
          <>
            {/* Mobile: List View */}
            <div className="space-y-2 md:hidden">
              {filteredAdministrators.map((admin) => (
                <AdminListItem key={admin.id} admin={admin} />
              ))}
            </div>

            {/* Desktop: Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdministrators.map((admin) => (
                <AdminCard key={admin.id} admin={admin} />
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma administradora encontrada' : 'Nenhuma administradora cadastrada'}
              </p>
              {!searchTerm && (
                <Button variant="link" onClick={openNewForm} className="mt-2">
                  Cadastrar primeira administradora
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Dialog/Sheet */}
      {isMobile ? (
        <Sheet open={viewOpen} onOpenChange={setViewOpen}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {selectedAdmin?.name}
              </SheetTitle>
              <SheetDescription>Dados completos da administradora</SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(90vh-100px)] pr-4">
              <ViewContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {selectedAdmin?.name}
              </DialogTitle>
              <DialogDescription>Dados completos da administradora</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              <ViewContent />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
};

export default AdministratorsPage;
