import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Home, AlertTriangle, CheckCircle, Clock, DollarSign, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnitWithCharges {
  id: string;
  unit_number: string;
  block: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  charges: {
    id: string;
    amount: number;
    due_date: string;
    status: string;
    reference_month: string | null;
    description: string | null;
    total_with_fees: number | null;
  }[];
}

const CondominiumDetails = () => {
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch condominium info
  const { data: condominium, isLoading: loadingCondo } = useQuery({
    queryKey: ['condominium-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*, administrators(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch units with their charges
  const { data: units, isLoading: loadingUnits } = useQuery({
    queryKey: ['condominium-units', id],
    queryFn: async () => {
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, block, owner_name, owner_email, owner_phone')
        .eq('condominium_id', id!)
        .order('unit_number');
      if (unitsError) throw unitsError;
      if (!unitsData || unitsData.length === 0) return [];

      const unitIds = unitsData.map(u => u.id);
      const { data: chargesData, error: chargesError } = await supabase
        .from('charges')
        .select('id, unit_id, amount, due_date, status, reference_month, description, total_with_fees')
        .in('unit_id', unitIds)
        .order('due_date', { ascending: false });
      if (chargesError) throw chargesError;

      const chargesByUnit = (chargesData || []).reduce((acc, charge) => {
        if (!acc[charge.unit_id]) acc[charge.unit_id] = [];
        acc[charge.unit_id].push(charge);
        return acc;
      }, {} as Record<string, typeof chargesData>);

      return unitsData.map(unit => ({
        ...unit,
        charges: chargesByUnit[unit.id] || [],
      })) as UnitWithCharges[];
    },
    enabled: !!id,
  });

  // Compute stats
  const stats = React.useMemo(() => {
    if (!units) return { totalUnits: 0, unitsWithOverdue: 0, totalPending: 0, totalOverdue: 0, overdueMonths: new Map<string, number>() };

    let totalPending = 0;
    let totalOverdue = 0;
    let unitsWithOverdue = 0;
    const overdueMonths = new Map<string, number>();

    units.forEach(unit => {
      let hasOverdue = false;
      unit.charges.forEach(c => {
        if (c.status === 'pending') totalPending += Number(c.amount);
        if (c.status === 'overdue') {
          totalOverdue += Number(c.total_with_fees || c.amount);
          hasOverdue = true;
          const month = c.reference_month || c.due_date.substring(0, 7);
          overdueMonths.set(month, (overdueMonths.get(month) || 0) + 1);
        }
      });
      if (hasOverdue) unitsWithOverdue++;
    });

    return { totalUnits: units.length, unitsWithOverdue, totalPending, totalOverdue, overdueMonths };
  }, [units]);

  // Sorted overdue months
  const sortedOverdueMonths = React.useMemo(() => {
    return Array.from(stats.overdueMonths.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stats.overdueMonths]);

  // Filter units
  const filteredUnits = React.useMemo(() => {
    if (!units) return [];
    return units.filter(unit => {
      const matchSearch = !searchTerm ||
        unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.block?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'all') return matchSearch;
      if (statusFilter === 'overdue') return matchSearch && unit.charges.some(c => c.status === 'overdue');
      if (statusFilter === 'pending') return matchSearch && unit.charges.some(c => c.status === 'pending');
      if (statusFilter === 'paid') return matchSearch && unit.charges.every(c => c.status === 'paid');
      return matchSearch;
    });
  }, [units, searchTerm, statusFilter]);

  const getOverdueMonthsCount = (unit: UnitWithCharges) => {
    const overdueCharges = unit.charges.filter(c => c.status === 'overdue');
    const months = new Set(overdueCharges.map(c => c.reference_month || c.due_date.substring(0, 7)));
    return months.size;
  };

  const getOverdueTotal = (unit: UnitWithCharges) => {
    return unit.charges
      .filter(c => c.status === 'overdue')
      .reduce((sum, c) => sum + Number(c.total_with_fees || c.amount), 0);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatMonth = (m: string) => {
    const [year, month] = m.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const isLoading = loadingCondo || loadingUnits;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!condominium) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Condomínio não encontrado.</p>
        <Link to="/portal/corporativo/condominios">
          <Button variant="link">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/portal/corporativo/condominios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7" />
              {condominium.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {condominium.address || 'Sem endereço'} • Administradora: {(condominium as any).administrators?.name || 'N/A'}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Unidades</p>
                  <p className="text-2xl font-bold">{stats.totalUnits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidades Inadimplentes</p>
                  <p className="text-2xl font-bold text-destructive">{stats.unitsWithOverdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vencido (c/ encargos)</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalOverdue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue by Month */}
        {sortedOverdueMonths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Inadimplência por Mês de Referência
              </CardTitle>
              <CardDescription>Quantidade de cotas vencidas por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sortedOverdueMonths.map(([month, count]) => (
                  <Badge key={month} variant="destructive" className="text-sm px-3 py-1">
                    {formatMonth(month)}: {count} {count === 1 ? 'cota' : 'cotas'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Units Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unidades e Cobranças</CardTitle>
            <CardDescription>Visão detalhada de cada unidade com status de pagamento</CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por unidade, bloco ou proprietário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="overdue">Vencidos</TabsTrigger>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="paid">Em dia</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUnits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {units?.length === 0 ? 'Nenhuma unidade cadastrada neste condomínio.' : 'Nenhuma unidade encontrada com os filtros aplicados.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Proprietário</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Meses Atrasados</TableHead>
                      <TableHead className="text-right">Valor Vencido</TableHead>
                      <TableHead className="text-center">Cotas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map(unit => {
                      const overdueCount = getOverdueMonthsCount(unit);
                      const overdueTotal = getOverdueTotal(unit);
                      const hasOverdue = overdueCount > 0;
                      const hasPending = unit.charges.some(c => c.status === 'pending');

                      return (
                        <TableRow key={unit.id} className={hasOverdue ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">
                            <div>
                              <span>{unit.unit_number}</span>
                              {unit.block && <span className="text-muted-foreground ml-1">/ {unit.block}</span>}
                            </div>
                          </TableCell>
                          <TableCell>{unit.owner_name || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm space-y-0.5">
                              {unit.owner_email && <div className="text-muted-foreground">{unit.owner_email}</div>}
                              {unit.owner_phone && <div className="text-muted-foreground">{unit.owner_phone}</div>}
                              {!unit.owner_email && !unit.owner_phone && <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasOverdue ? (
                              <Badge variant="destructive">Inadimplente</Badge>
                            ) : hasPending ? (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" /> Em dia
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {overdueCount > 0 ? (
                              <span className="font-bold text-destructive">{overdueCount}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {overdueTotal > 0 ? (
                              <span className="text-destructive">{formatCurrency(overdueTotal)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{unit.charges.length}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CondominiumDetails;
