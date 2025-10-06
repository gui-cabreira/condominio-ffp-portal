import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, FileUp, Brain, CheckCircle, XCircle, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { CNPJLookup } from '@/components/forms/CNPJLookup';
import { CNPJData } from '@/hooks/useCNPJ';

interface Administrator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  address?: string;
  contact_person?: string;
  active: boolean;
  created_at: string;
  fantasy_name?: string;
  legal_name?: string;
  legal_nature?: string;
  opening_date?: string;
  status?: string;
  size?: string;
  capital?: string;
  main_activity?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface ChargeImport {
  id: string;
  administrator_id: string;
  file_name?: string;
  total_charges: number;
  successful_imports: number;
  failed_imports: number;
  status: string;
  created_at: string;
  administrators: { name: string };
}

const BackofficeManagement = () => {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [imports, setImports] = useState<ChargeImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [importContent, setImportContent] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Form states
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
    zip_code: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar administradoras
      const { data: adminsData, error: adminsError } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminsError) throw adminsError;

      // Carregar importações
      const { data: importsData, error: importsError } = await supabase
        .from('charge_imports')
        .select(`
          *,
          administrators (name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (importsError) throw importsError;

      setAdministrators(adminsData || []);
      setImports(importsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do backoffice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCNPJData = (data: CNPJData) => {
    setFormData({
      ...formData,
      cnpj: data.cnpj,
      name: data.legalName || data.name,
      email: data.email || formData.email,
      phone: data.phone || formData.phone,
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
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAdmin) {
        // Atualizar administradora existente
        const { error } = await supabase
          .from('administrators')
          .update(formData)
          .eq('id', editingAdmin.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Administradora atualizada com sucesso!"
        });
      } else {
        // Criar nova administradora
        const { error } = await supabase
          .from('administrators')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Administradora cadastrada com sucesso!"
        });
      }

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
        zip_code: ''
      });
      
      setEditingAdmin(null);
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving administrator:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar administradora",
        variant: "destructive"
      });
    }
  };

  const handleEditAdmin = (admin: Administrator) => {
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
      zip_code: admin.zip_code || ''
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta administradora?')) return;

    try {
      const { error } = await supabase
        .from('administrators')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Administradora excluída com sucesso!"
      });

      loadData();
    } catch (error) {
      console.error('Error deleting administrator:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir administradora",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const processChargesWithAI = async (administratorId: string) => {
    if (!importContent.trim()) {
      toast({
        title: "Erro",
        description: "Adicione conteúdo para processar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-charges-ai', {
        body: {
          content: importContent,
          administratorId,
          fileName: importFile?.name || 'Manual Input'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Processamento Concluído!",
          description: `${data.successfulImports} cobranças importadas com sucesso. ${data.failedImports} falharam.`
        });
        
        setImportContent('');
        setImportFile(null);
        loadData();
      } else {
        throw new Error(data.error || 'Erro no processamento');
      }
    } catch (error) {
      console.error('Error processing charges:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar cobranças com IA",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'completed_with_errors': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'completed_with_errors': return 'Concluído c/ Erros';
      case 'processing': return 'Processando';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backoffice</h1>
          <p className="text-muted-foreground">Gestão completa de administradoras e cobranças</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
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
              zip_code: ''
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Administradora
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? 'Editar Administradora' : 'Cadastrar Administradora'}
              </DialogTitle>
              <DialogDescription>
                {editingAdmin ? 'Atualize os dados da administradora' : 'Cadastre uma nova administradora parceira'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <CNPJLookup 
                onDataFound={handleCNPJData}
                initialCNPJ={formData.cnpj}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Razão Social *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Pessoa de Contato</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Endereço Completo</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAdmin ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="administrators" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="administrators" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Administradoras
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Lançamento IA
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="administrators" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {administrators.map((admin) => (
              <Card key={admin.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{admin.name}</CardTitle>
                    <Badge variant={admin.active ? "default" : "secondary"}>
                      {admin.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardDescription>{admin.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {admin.phone && (
                    <p className="text-sm text-muted-foreground">
                      📞 {admin.phone}
                    </p>
                  )}
                  {admin.contact_person && (
                    <p className="text-sm text-muted-foreground">
                      👤 {admin.contact_person}
                    </p>
                  )}
                  {admin.cnpj && (
                    <p className="text-sm text-muted-foreground">
                      🏢 {admin.cnpj}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEditAdmin(admin)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteAdmin(admin.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Lançamento Inteligente de Cobranças
              </CardTitle>
              <CardDescription>
                Use IA para processar automaticamente arquivos ou texto e gerar cobranças
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="administrator">Administradora</Label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedAdmin?.id || ''}
                  onChange={(e) => {
                    const admin = administrators.find(a => a.id === e.target.value);
                    setSelectedAdmin(admin || null);
                  }}
                >
                  <option value="">Selecione uma administradora</option>
                  {administrators.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="file">Upload de Arquivo (Opcional)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                />
              </div>

              <div>
                <Label htmlFor="content">Conteúdo para Processamento</Label>
                <Textarea
                  id="content"
                  placeholder="Cole aqui o conteúdo das cobranças ou upload um arquivo acima..."
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  rows={10}
                />
              </div>

              <Button
                onClick={() => selectedAdmin && processChargesWithAI(selectedAdmin.id)}
                disabled={!selectedAdmin || !importContent.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando com IA...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Processar com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Importações</CardTitle>
              <CardDescription>
                Acompanhe o status das importações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Administradora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sucesso</TableHead>
                    <TableHead>Falhas</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        {new Date(imp.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{imp.administrators.name}</TableCell>
                      <TableCell>{imp.file_name || 'Manual'}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(imp.status)} text-white`}>
                          {getStatusText(imp.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{imp.total_charges}</TableCell>
                      <TableCell className="text-green-600">
                        {imp.successful_imports}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {imp.failed_imports}
                      </TableCell>
                      <TableCell className="w-20">
                        <Progress
                          value={imp.total_charges > 0 ? (imp.successful_imports / imp.total_charges) * 100 : 0}
                          className="h-2"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackofficeManagement;