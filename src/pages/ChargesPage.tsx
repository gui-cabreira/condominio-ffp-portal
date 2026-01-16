import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Upload, FileText, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NegotiationDialog } from '@/components/NegotiationDialog';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

interface Charge {
  id: string;
  unit_id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: string;
  reference_month?: string;
  description?: string;
  units: {
    unit_number: string;
    owner_name: string;
    condominium_id: string;
    condominiums: {
      id: string;
      name: string;
      administrator_id: string;
      administrators: {
        id: string;
        name: string;
      };
    };
  };
}

export default function ChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChargeDialogOpen, setNewChargeDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<string | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdministrator, setSelectedAdministrator] = useState<string>('');
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [chargesResult, unitsResult, administratorsResult, condominiumsResult] = await Promise.all([
        supabase
          .from('charges')
          .select(`
            *,
            units (
              unit_number,
              owner_name,
              condominium_id,
              condominiums (
                id,
                name,
                administrator_id,
                administrators (
                  id,
                  name
                )
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('units')
          .select('*, condominiums(id, name, administrator_id)'),
        supabase
          .from('administrators')
          .select('*')
          .order('name'),
        supabase
          .from('condominiums')
          .select('*')
          .order('name')
      ]);

      if (chargesResult.error) throw chargesResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (administratorsResult.error) throw administratorsResult.error;
      if (condominiumsResult.error) throw condominiumsResult.error;

      setCharges(chargesResult.data || []);
      setUnits(unitsResult.data || []);
      setAdministrators(administratorsResult.data || []);
      setCondominiums(condominiumsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar negociações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleUploadBoleto = async () => {
    if (!boletoFile || !selectedCharge) return;

    try {
      const fileExt = boletoFile.name.split('.').pop();
      const fileName = `${selectedCharge}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('boletos')
        .upload(fileName, boletoFile);

      if (uploadError) throw uploadError;

      toast({
        title: 'Sucesso',
        description: 'Boleto enviado com sucesso',
      });

      setBoletoFile(null);
      setSelectedCharge(null);
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Error uploading boleto:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar boleto',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cobrança?')) return;

    try {
      const { error } = await supabase
        .from('charges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Negociação excluída com sucesso',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting charge:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir negociação',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      default: return status;
    }
  };

  // Filtrar condomínios por administradora selecionada
  const filteredCondominiums = selectedAdministrator
    ? condominiums.filter(c => c.administrator_id === selectedAdministrator)
    : condominiums;

  // Filtrar unidades por condomínio selecionado
  const filteredUnits = selectedCondominium
    ? units.filter(u => u.condominium_id === selectedCondominium)
    : selectedAdministrator
    ? units.filter(u => {
        const condo = condominiums.find(c => c.id === u.condominium_id);
        return condo?.administrator_id === selectedAdministrator;
      })
    : units;

  // Filtrar cobranças
  const filteredCharges = charges.filter((charge) => {
    const matchesSearch = charge.units.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.units.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charge.units.condominiums?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAdministrator = !selectedAdministrator || 
      charge.units.condominiums?.administrators?.id === selectedAdministrator;
    
    const matchesCondominium = !selectedCondominium || 
      charge.units.condominium_id === selectedCondominium;
    
    return matchesSearch && matchesAdministrator && matchesCondominium;
  });

  const pendingCharges = filteredCharges.filter(c => c.status === 'pending');
  const paidCharges = filteredCharges.filter(c => c.status === 'paid');
  const overdueCharges = filteredCharges.filter(c => c.status === 'overdue');

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FileText}
        title="Negociações"
        description="Gerencie todas as negociações e acordos"
        actions={
          <Button onClick={() => setNewChargeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Negociação
          </Button>
        }
      />

      <NegotiationDialog
        open={newChargeDialogOpen}
        onOpenChange={setNewChargeDialogOpen}
        administrators={administrators}
        condominiums={condominiums}
        units={units}
        onSuccess={loadData}
      />

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Boleto</DialogTitle>
            <DialogDescription>Faça upload do boleto para esta cobrança</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="boleto">Arquivo do Boleto</Label>
              <Input
                id="boleto"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBoletoFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUploadBoleto} disabled={!boletoFile}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCharges.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCharges.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCharges.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Negociações</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={selectedAdministrator}
                onChange={(e) => {
                  setSelectedAdministrator(e.target.value);
                  setSelectedCondominium(''); // Reset condomínio ao trocar administradora
                }}
              >
                <option value="">Todas Administradoras</option>
                {administrators.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={selectedCondominium}
                onChange={(e) => setSelectedCondominium(e.target.value)}
                disabled={!selectedAdministrator && condominiums.length > 20}
              >
                <option value="">Todos Condomínios</option>
                {filteredCondominiums.map((condo) => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="overdue">Vencidas</TabsTrigger>
              <TabsTrigger value="paid">Pagas</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <ChargesTable 
                charges={filteredCharges} 
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                handleDelete={handleDelete}
                setSelectedCharge={setSelectedCharge}
                setUploadDialogOpen={setUploadDialogOpen}
              />
            </TabsContent>
            <TabsContent value="pending">
              <ChargesTable 
                charges={pendingCharges} 
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                handleDelete={handleDelete}
                setSelectedCharge={setSelectedCharge}
                setUploadDialogOpen={setUploadDialogOpen}
              />
            </TabsContent>
            <TabsContent value="overdue">
              <ChargesTable 
                charges={overdueCharges} 
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                handleDelete={handleDelete}
                setSelectedCharge={setSelectedCharge}
                setUploadDialogOpen={setUploadDialogOpen}
              />
            </TabsContent>
            <TabsContent value="paid">
              <ChargesTable 
                charges={paidCharges} 
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                handleDelete={handleDelete}
                setSelectedCharge={setSelectedCharge}
                setUploadDialogOpen={setUploadDialogOpen}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
    </PageContainer>
  );
}

function ChargesTable({ charges, getStatusColor, getStatusText, handleDelete, setSelectedCharge, setUploadDialogOpen }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Administradora</TableHead>
          <TableHead>Condomínio</TableHead>
          <TableHead>Unidade</TableHead>
          <TableHead>Proprietário</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {charges.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Nenhuma negociação encontrada
            </TableCell>
          </TableRow>
        ) : (
          charges.map((charge: Charge) => (
            <TableRow key={charge.id}>
              <TableCell className="font-medium">
                {charge.units.condominiums?.administrators?.name || '-'}
              </TableCell>
              <TableCell>{charge.units.condominiums?.name}</TableCell>
              <TableCell>{charge.units.unit_number}</TableCell>
              <TableCell>{charge.units.owner_name}</TableCell>
              <TableCell>R$ {charge.amount.toFixed(2)}</TableCell>
              <TableCell>{new Date(charge.due_date).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(charge.status)}>
                  {getStatusText(charge.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedCharge(charge.id);
                      setUploadDialogOpen(true);
                    }}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(charge.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
