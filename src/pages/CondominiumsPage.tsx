import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CNPJLookup } from '@/components/forms/CNPJLookup';
import { CNPJData } from '@/hooks/useCNPJ';

interface Condominium {
  id: string;
  name: string;
  address: string;
  total_units: number;
  administrator_id?: string;
  administrators?: { name: string };
  created_at: string;
}

export default function CondominiumsPage() {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_units: 0,
    administrator_id: '',
  });

  const handleCNPJData = (data: CNPJData) => {
    setFormData({
      ...formData,
      name: data.fantasyName || data.legalName || data.name,
      address: data.address.fullAddress || formData.address,
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [condosResult, adminsResult] = await Promise.all([
        supabase
          .from('condominiums')
          .select('*, administrators(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('administrators')
          .select('*')
          .eq('active', true)
      ]);

      if (condosResult.error) throw condosResult.error;
      if (adminsResult.error) throw adminsResult.error;

      setCondominiums(condosResult.data || []);
      setAdministrators(adminsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar condomínios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('condominiums')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Condomínio atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('condominiums')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Condomínio cadastrado com sucesso',
        });
      }

      setFormData({ name: '', address: '', total_units: 0, administrator_id: '' });
      setEditingId(null);
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving condominium:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar condomínio',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (condo: Condominium) => {
    setEditingId(condo.id);
    setFormData({
      name: condo.name,
      address: condo.address || '',
      total_units: condo.total_units,
      administrator_id: condo.administrator_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este condomínio?')) return;

    try {
      const { error } = await supabase
        .from('condominiums')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Condomínio excluído com sucesso',
      });

      loadData();
    } catch (error) {
      console.error('Error deleting condominium:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir condomínio',
        variant: 'destructive',
      });
    }
  };

  const filteredCondominiums = condominiums.filter((condo) =>
    condo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    condo.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Condomínios
          </h1>
          <p className="text-muted-foreground">Gerencie todos os condomínios</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData({ name: '', address: '', total_units: 0, administrator_id: '' }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Condomínio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Condomínio</DialogTitle>
              <DialogDescription>
                {editingId ? 'Edite os dados do condomínio' : 'Cadastre um novo condomínio no sistema'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <CNPJLookup onDataFound={handleCNPJData} />
              
              <div>
                <Label htmlFor="name">Nome do Condomínio *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Edifício Vila Real"
                />
              </div>
              <div>
                <Label htmlFor="address">Endereço Completo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Número - Bairro, Cidade/UF"
                />
              </div>
              <div>
                <Label htmlFor="total_units">Total de Unidades *</Label>
                <Input
                  id="total_units"
                  type="number"
                  value={formData.total_units}
                  onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="administrator_id">Administradora</Label>
                <select
                  id="administrator_id"
                  className="w-full p-2 border rounded-md bg-background"
                  value={formData.administrator_id}
                  onChange={(e) => setFormData({ ...formData, administrator_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {administrators.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Condomínios</CardTitle>
          <CardDescription>
            Pesquise e gerencie os condomínios cadastrados
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar condomínio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Administradora</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCondominiums.map((condo) => (
                <TableRow key={condo.id}>
                  <TableCell className="font-medium">{condo.name}</TableCell>
                  <TableCell>{condo.address || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{condo.total_units}</Badge>
                  </TableCell>
                  <TableCell>{condo.administrators?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(condo)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(condo.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
