import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Sparkles, Check, Loader2, FileText, User, Building2, DollarSign, AlertCircle, Table as TableIcon, Edit, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DefaulterUnit {
  unidade: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cobrancas: {
    vencimento: string;
    competencia: string;
    principal: string;
    juros: string;
    multa: string;
    honorarios: string;
    total: string;
  }[];
}

type Administrator = {
  id: string;
  name: string;
  management_system_id: string | null;
};

type ManagementSystem = {
  id: string;
  name: string;
  csv_format: any;
};

type Condominium = {
  id: string;
  name: string;
  administrator_id: string;
};

const RegisterDefaulter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DefaulterUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedAdministrator, setSelectedAdministrator] = useState<string>('');
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const [adminSearch, setAdminSearch] = useState('');
  const { toast } = useToast();

  // Buscar administradoras
  const { data: administrators } = useQuery({
    queryKey: ['administrators-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('id, name, management_system_id')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data as Administrator[];
    },
  });

  // Buscar condomínios da administradora selecionada
  const { data: condominiums } = useQuery({
    queryKey: ['condominiums-for-administrator', selectedAdministrator],
    queryFn: async () => {
      if (!selectedAdministrator) return [];
      
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name, administrator_id')
        .eq('administrator_id', selectedAdministrator)
        .order('name');
      
      if (error) throw error;
      return data as Condominium[];
    },
    enabled: !!selectedAdministrator,
  });

  // Buscar sistema de gestão
  const { data: managementSystem } = useQuery({
    queryKey: ['management-system', selectedAdministrator],
    queryFn: async () => {
      if (!selectedAdministrator) return null;
      
      const admin = administrators?.find(a => a.id === selectedAdministrator);
      if (!admin?.management_system_id) return null;
      
      const { data, error } = await supabase
        .from('management_systems')
        .select('*')
        .eq('id', admin.management_system_id)
        .single();
      
      if (error) throw error;
      return data as ManagementSystem;
    },
    enabled: !!selectedAdministrator && !!administrators,
  });

  const filteredAdministrators = administrators?.filter(admin =>
    admin.name.toLowerCase().includes(adminSearch.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 10MB',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV',
          variant: 'destructive'
        });
        return;
      }
      setCsvFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const units: DefaulterUnit[] = [];
      let currentUnit: DefaulterUnit | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detecta início de nova unidade (formato: "0002 A1  - NOME")
        if (line.match(/^"\d{4}\s+[A-Z0-9]+\s+-\s+/)) {
          if (currentUnit) {
            units.push(currentUnit);
          }
          
          const match = line.match(/^"(\d{4}\s+[A-Z0-9]+)\s+-\s+([^"]+)"/);
          if (match) {
            currentUnit = {
              unidade: match[1].trim(),
              nome: match[2].trim(),
              cobrancas: []
            };
          }
        }
        
        // Detecta linhas de cobrança (tem valores numéricos)
        if (currentUnit && line.match(/^\d{2}\/\d{2}\/\d{2}/)) {
          const values = line.split(',');
          if (values.length >= 10) {
            currentUnit.cobrancas.push({
              vencimento: values[0],
              competencia: values[1],
              principal: values[4]?.replace(/"/g, ''),
              juros: values[5]?.replace(/"/g, ''),
              multa: values[6]?.replace(/"/g, ''),
              honorarios: values[8]?.replace(/"/g, ''),
              total: values[9]?.replace(/"/g, '')
            });
          }
        }
      }
      
      if (currentUnit) {
        units.push(currentUnit);
      }

      setParsedData(units);
      toast({
        title: 'CSV processado',
        description: `${units.length} inadimplentes encontrados`
      });
    } catch (err) {
      toast({
        title: 'Erro ao processar CSV',
        description: 'Formato do arquivo inválido',
        variant: 'destructive'
      });
    }
  };

  const updateUnit = (index: number, field: keyof DefaulterUnit, value: string) => {
    const updated = [...parsedData];
    updated[index] = { ...updated[index], [field]: value };
    setParsedData(updated);
  };

  const saveUnits = async () => {
    setSaving(true);
    try {
      // Aqui você implementaria a lógica de salvar no banco
      toast({
        title: 'Unidades cadastradas',
        description: `${parsedData.length} unidades foram cadastradas com sucesso`
      });
    } catch (err) {
      toast({
        title: 'Erro ao cadastrar',
        description: 'Ocorreu um erro ao cadastrar as unidades',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error: functionError } = await supabase.functions.invoke('process-boleto-ai', {
        body: formData,
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Erro ao chamar a função');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: '✨ Boleto processado com sucesso!',
        description: 'Todos os dados foram extraídos e cadastrados automaticamente.'
      });
    } catch (err: any) {
      console.error('Erro ao processar:', err);
      setError(err.message || 'Erro ao processar boleto');
      toast({
        title: 'Erro ao processar',
        description: err.message || 'Ocorreu um erro ao processar o boleto',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <Card className="mb-8 border-2 border-ffp-gold/20 bg-gradient-to-br from-white to-ffp-gold/5">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-ffp-gold/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-ffp-gold" />
          </div>
          <CardTitle className="text-2xl text-ffp-navy">Cadastro de Inadimplentes</CardTitle>
          <CardDescription className="text-base mt-2">
            Importe boletos individuais ou lotes de inadimplentes via CSV
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="boleto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="boleto">
            <FileText className="w-4 h-4 mr-2" />
            Upload de Boleto
          </TabsTrigger>
          <TabsTrigger value="csv">
            <TableIcon className="w-4 h-4 mr-2" />
            Import CSV
          </TabsTrigger>
        </TabsList>

        {/* Tab: Upload de Boleto */}
        <TabsContent value="boleto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-ffp-gold" />
                Processamento Automático com IA
              </CardTitle>
              <CardDescription>
                Faça upload do boleto e deixe nossa IA extrair todos os dados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <User className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Dados do Inadimplente</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Condomínio e Unidade</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Valores e Vencimento</p>
                </div>
              </div>

              {/* Área de Upload */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="text-lg font-medium mb-2">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Clique para selecionar o boleto
                      </p>
                      <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Botão de Processar */}
              {file && !result && (
                <Button 
                  className="w-full py-6 text-lg"
                  onClick={processFile}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Processar Boleto com IA
                    </>
                  )}
                </Button>
              )}

              {/* Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Resultado */}
              {result && result.success && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <Alert className="border-green-500 bg-green-50">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 font-medium">
                      ✨ Boleto processado com sucesso! Todos os dados foram cadastrados automaticamente.
                    </AlertDescription>
                  </Alert>

                  {/* Dados Extraídos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Administradora */}
                    {result.data?.extracted?.administradora && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Administradora
                            <Badge variant="outline" className="ml-auto">
                              {result.data.created.administratorId ? 'Encontrada' : 'Criada'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-medium">{result.data.extracted.administradora.nome}</p>
                          {result.data.extracted.administradora.cnpj && (
                            <p className="text-sm text-muted-foreground">CNPJ: {result.data.extracted.administradora.cnpj}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Condomínio */}
                    {result.data?.extracted?.condominio && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Condomínio
                            <Badge variant="outline" className="ml-auto">
                              {result.data.created.condominiumId ? 'Encontrado' : 'Criado'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-medium">{result.data.extracted.condominio.nome}</p>
                          {result.data.extracted.condominio.endereco && (
                            <p className="text-sm text-muted-foreground">{result.data.extracted.condominio.endereco}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Inadimplente */}
                    {result.data?.extracted?.inadimplente && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Inadimplente
                            <Badge variant="outline" className="ml-auto">
                              Unidade {result.data.extracted.inadimplente.unidade}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-medium">{result.data.extracted.inadimplente.nome}</p>
                          {result.data.extracted.inadimplente.cpf && (
                            <p className="text-sm text-muted-foreground">CPF: {result.data.extracted.inadimplente.cpf}</p>
                          )}
                          {result.data.extracted.inadimplente.telefone && (
                            <p className="text-sm text-muted-foreground">Tel: {result.data.extracted.inadimplente.telefone}</p>
                          )}
                          {result.data.extracted.inadimplente.email && (
                            <p className="text-sm text-muted-foreground">Email: {result.data.extracted.inadimplente.email}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Cobrança */}
                    {result.data?.extracted?.cobranca && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Cobrança
                            <Badge className="ml-auto">Criada</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-medium text-lg">R$ {result.data.extracted.cobranca.valor?.toFixed(2)}</p>
                          {result.data.extracted.cobranca.vencimento && (
                            <p className="text-sm text-muted-foreground">
                              Vencimento: {new Date(result.data.extracted.cobranca.vencimento).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          {result.data.extracted.cobranca.descricao && (
                            <p className="text-sm text-muted-foreground">{result.data.extracted.cobranca.descricao}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        setFile(null);
                        setResult(null);
                      }}
                    >
                      Processar Novo Boleto
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link to="/portal/corporativo/cobrancas">
                        Ver Cobranças
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Import CSV */}
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="w-5 h-5" />
                Import em Lote via CSV
              </CardTitle>
              <CardDescription>
                Selecione a administradora e o condomínio, depois faça upload do CSV de inadimplentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seleção de Administradora e Condomínio */}
              {!parsedData.length && (
                <div className="space-y-4">
                  {/* Administradora */}
                  <div className="space-y-2">
                    <Label>Administradora *</Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar administradora..."
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={selectedAdministrator}
                        onValueChange={(value) => {
                          setSelectedAdministrator(value);
                          setSelectedCondominium('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a administradora" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredAdministrators?.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedAdministrator && managementSystem && (
                      <Badge variant="outline" className="mt-2">
                        Sistema: {managementSystem.name}
                      </Badge>
                    )}
                  </div>

                  {/* Condomínio */}
                  {selectedAdministrator && (
                    <div className="space-y-2">
                      <Label>Condomínio *</Label>
                      <Select
                        value={selectedCondominium}
                        onValueChange={setSelectedCondominium}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o condomínio" />
                        </SelectTrigger>
                        <SelectContent>
                          {condominiums?.map((condo) => (
                            <SelectItem key={condo.id} value={condo.id}>
                              {condo.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Upload CSV */}
              {selectedAdministrator && selectedCondominium && !parsedData.length && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="csv-upload"
                    className="hidden"
                    accept=".csv"
                    onChange={handleCsvChange}
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    {csvFile ? (
                      <div>
                        <p className="text-lg font-medium mb-2">{csvFile.name}</p>
                        <p className="text-sm text-muted-foreground">{(csvFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium mb-2">
                          Clique para selecionar o CSV
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Formato: {managementSystem?.name || 'Selecione uma administradora'}
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {parsedData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{parsedData.length} inadimplentes encontrados</h3>
                      <p className="text-sm text-muted-foreground">
                        Condomínio: {condominiums?.find(c => c.id === selectedCondominium)?.name}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => { setCsvFile(null); setParsedData([]); }}>
                      Novo CSV
                    </Button>
                  </div>

                  {/* Lista de unidades */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {parsedData.map((unit, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Unidade {unit.unidade}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Nome do Proprietário</Label>
                              <Input 
                                value={unit.nome}
                                onChange={(e) => updateUnit(index, 'nome', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>CPF</Label>
                              <Input 
                                value={unit.cpf || ''}
                                onChange={(e) => updateUnit(index, 'cpf', e.target.value)}
                                placeholder="000.000.000-00"
                              />
                            </div>
                            <div>
                              <Label>Telefone</Label>
                              <Input 
                                value={unit.telefone || ''}
                                onChange={(e) => updateUnit(index, 'telefone', e.target.value)}
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                            <div>
                              <Label>E-mail</Label>
                              <Input 
                                value={unit.email || ''}
                                onChange={(e) => updateUnit(index, 'email', e.target.value)}
                                placeholder="email@exemplo.com"
                                type="email"
                              />
                            </div>
                          </div>

                          {/* Cobranças */}
                          {unit.cobrancas.length > 0 && (
                            <div>
                              <Label className="mb-2 block">Cobranças ({unit.cobrancas.length})</Label>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Competência</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {unit.cobrancas.slice(0, 3).map((cob, i) => (
                                    <TableRow key={i}>
                                      <TableCell>{cob.vencimento}</TableCell>
                                      <TableCell>{cob.competencia}</TableCell>
                                      <TableCell className="text-right font-medium">{cob.total}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {unit.cobrancas.length > 3 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  + {unit.cobrancas.length - 3} cobranças adicionais
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Botão de Salvar */}
                  <Button 
                    className="w-full py-6 text-lg"
                    onClick={saveUnits}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Cadastrar {parsedData.length} Unidades
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegisterDefaulter;