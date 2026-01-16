import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Key, Plus, Copy, Eye, EyeOff, Trash2, RefreshCw, 
  Shield, Clock, Activity, AlertTriangle, CheckCircle2,
  ExternalLink, Code
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Gerar token seguro
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'ffp_';
  let token = prefix;
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const AVAILABLE_ACTIONS = [
  { id: 'upsert_administrator', label: 'Criar/Atualizar Administradoras' },
  { id: 'upsert_condominium', label: 'Criar/Atualizar Condomínios' },
  { id: 'upsert_unit', label: 'Criar/Atualizar Unidades' },
  { id: 'upsert_charges', label: 'Criar/Atualizar Cobranças' },
  { id: 'upsert_agreement', label: 'Criar/Atualizar Acordos' },
  { id: 'upsert_extrajudicial', label: 'Criar/Atualizar Extrajudicial' },
  { id: 'bulk_import', label: 'Importação em Lote' },
];

interface IntegrationToken {
  id: string;
  name: string;
  description: string | null;
  token: string;
  token_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  allowed_actions: string[];
  created_at: string;
}

export default function IntegrationSettingsPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showTokenId, setShowTokenId] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  
  // Form state
  const [tokenName, setTokenName] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>(AVAILABLE_ACTIONS.map(a => a.id));
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(30);

  // Fetch tokens
  const { data: tokens, isLoading } = useQuery({
    queryKey: ['integration-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_tokens')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as IntegrationToken[];
    }
  });

  // Create token mutation
  const createToken = useMutation({
    mutationFn: async () => {
      const token = generateToken();
      const { data: { user } } = await supabase.auth.getUser();
      
      const expiresAt = hasExpiration 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('integration_tokens')
        .insert({
          name: tokenName,
          description: tokenDescription || null,
          token: token,
          token_prefix: token.substring(0, 12),
          allowed_actions: selectedActions,
          expires_at: expiresAt,
          created_by: user?.id
        });

      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      setNewlyCreatedToken(token);
      queryClient.invalidateQueries({ queryKey: ['integration-tokens'] });
      toast.success('Token criado com sucesso!');
      // Reset form but keep dialog open to show token
      setTokenName('');
      setTokenDescription('');
      setSelectedActions(AVAILABLE_ACTIONS.map(a => a.id));
      setHasExpiration(false);
      setExpirationDays(30);
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar token: ' + error.message);
    }
  });

  // Toggle token status
  const toggleTokenStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('integration_tokens')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-tokens'] });
      toast.success('Status do token atualizado');
    }
  });

  // Delete token
  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integration_tokens')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-tokens'] });
      toast.success('Token removido');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setNewlyCreatedToken(null);
    setTokenName('');
    setTokenDescription('');
  };

  const endpointUrl = `https://szryusxuheimljfhsuku.supabase.co/functions/v1/external-integration-webhook`;

  return (
    <PageContainer>
      <PageHeader
        title="Integrações Externas"
        description="Gerencie tokens de API para integração com sistemas externos"
      />

      <div className="space-y-6">
        {/* Endpoint Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5" />
              Endpoint de Integração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono break-all">
                {endpointUrl}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Use este endpoint para enviar dados de sistemas externos. Inclua o header <code className="bg-muted px-1 rounded">X-API-Key</code> com seu token.
            </div>
          </CardContent>
        </Card>

        {/* Tokens List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Tokens de API
              </CardTitle>
              <CardDescription>
                Crie e gerencie tokens para autenticação de sistemas externos
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setNewlyCreatedToken(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Token
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                {newlyCreatedToken ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Token Criado com Sucesso!
                      </DialogTitle>
                      <DialogDescription>
                        Copie e guarde este token em um local seguro. Ele não será exibido novamente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Atenção:</strong> Este token será exibido apenas uma vez. 
                            Copie-o agora e guarde em um local seguro.
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Seu Token de API</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={newlyCreatedToken} 
                            readOnly 
                            className="font-mono text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => copyToClipboard(newlyCreatedToken)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCloseDialog}>
                        Fechar
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Token</DialogTitle>
                      <DialogDescription>
                        Configure as permissões e informações do novo token de integração.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Token *</Label>
                        <Input
                          id="name"
                          placeholder="Ex: Sistema Administradora XYZ"
                          value={tokenName}
                          onChange={(e) => setTokenName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          placeholder="Descreva o uso deste token..."
                          value={tokenDescription}
                          onChange={(e) => setTokenDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Ações Permitidas</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {AVAILABLE_ACTIONS.map((action) => (
                            <div key={action.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={action.id}
                                checked={selectedActions.includes(action.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedActions([...selectedActions, action.id]);
                                  } else {
                                    setSelectedActions(selectedActions.filter(a => a !== action.id));
                                  }
                                }}
                              />
                              <label htmlFor={action.id} className="text-sm cursor-pointer">
                                {action.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Definir Expiração</Label>
                          <Switch 
                            checked={hasExpiration} 
                            onCheckedChange={setHasExpiration}
                          />
                        </div>
                        {hasExpiration && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={expirationDays}
                              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">dias</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => createToken.mutate()}
                        disabled={!tokenName || selectedActions.length === 0 || createToken.isPending}
                      >
                        {createToken.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Gerar Token
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tokens && tokens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Uso</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{token.name}</div>
                          {token.description && (
                            <div className="text-xs text-muted-foreground">{token.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {showTokenId === token.id ? token.token : `${token.token_prefix}...`}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowTokenId(showTokenId === token.id ? null : token.id)}
                          >
                            {showTokenId === token.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(token.token)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={token.is_active}
                            onCheckedChange={(checked) => 
                              toggleTokenStatus.mutate({ id: token.id, isActive: checked })
                            }
                          />
                          <Badge variant={token.is_active ? "default" : "secondary"}>
                            {token.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {token.last_used_at ? (
                          <span className="text-sm">
                            {format(new Date(token.last_used_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{token.usage_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {token.expires_at ? (
                          <span className={`text-sm ${new Date(token.expires_at) < new Date() ? 'text-red-500' : ''}`}>
                            {format(new Date(token.expires_at), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Token</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover o token "{token.name}"? 
                                Esta ação não pode ser desfeita e sistemas que usam este token 
                                deixarão de funcionar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteToken.mutate(token.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">Nenhum token criado</h3>
                <p className="text-muted-foreground mb-4">
                  Crie tokens para permitir que sistemas externos enviem dados.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Token
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Documentação da API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Exemplo de Requisição</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
{`curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: seu_token_aqui" \\
  -d '{
    "action": "upsert_charges",
    "data": [
      {
        "external_id": "ADM-2026-001",
        "unit_external_id": "COND-A-101",
        "charge_type": "inadimplencia",
        "amount": 450.00,
        "due_date": "2026-02-10",
        "description": "Taxa condominial Jan/2026"
      }
    ]
  }'`}
              </pre>

              <h4 className="mt-6">Ações Disponíveis</h4>
              <ul className="text-sm space-y-1">
                <li><code>upsert_administrator</code> - Criar/atualizar administradora</li>
                <li><code>upsert_condominium</code> - Criar/atualizar condomínio</li>
                <li><code>upsert_unit</code> - Criar/atualizar unidade</li>
                <li><code>upsert_charges</code> - Criar/atualizar cobranças</li>
                <li><code>upsert_agreement</code> - Criar/atualizar acordos</li>
                <li><code>upsert_extrajudicial</code> - Criar/atualizar casos extrajudiciais</li>
                <li><code>bulk_import</code> - Importação em lote</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
