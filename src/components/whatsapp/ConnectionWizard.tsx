import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, QrCode, Smartphone, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

interface ConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WizardStep = 'config' | 'qrcode' | 'success';

interface InstanceConfig {
  name: string;
  operationType: 'cobranca' | 'atendimento' | 'coach';
  operationMode: 'autonomous' | 'notifications' | 'hybrid';
  intentions: string[];
}

const INTENTIONS = [
  { id: 'cobranca', label: 'Cobrança e Negociação' },
  { id: 'atendimento', label: 'Atendimento ao Morador' },
  { id: 'boletos', label: 'Envio de Boletos' },
  { id: 'notificacoes', label: 'Notificações Gerais' },
];

export function ConnectionWizard({ open, onOpenChange, onSuccess }: ConnectionWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>('config');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [instanceData, setInstanceData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  const [config, setConfig] = useState<InstanceConfig>({
    name: '',
    operationType: 'cobranca',
    operationMode: 'autonomous',
    intentions: ['cobranca'],
  });


  // Mutation para criar instância
  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      // Gerar nome único para instância
      const instanceName = config.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      
      // 1. Criar instância no servidor UAZAPI - passa adminFieldValue para salvar no banco
      const { data: createResult, error: createError } = await supabase.functions.invoke('uazapi-connect', {
        body: {
          action: 'create',
          instanceName,
          instanceType: config.operationType,
          adminFieldValue: 'system', // Identificador para que a instância apareça na lista
        },
      });

      if (createError) throw createError;
      if (!createResult.success) throw new Error(createResult.error || 'Falha ao criar instância');

      return createResult;
    },
    onSuccess: async (data) => {
      setInstanceData(data);
      
      // O token vem da resposta do create
      const instanceToken = data.token || data.instance?.token;
      
      if (!instanceToken) {
        toast.error('Token da instância não retornado');
        return;
      }
      
      // 3. Conectar e gerar QR Code
      const { data: connectResult, error: connectError } = await supabase.functions.invoke('uazapi-connect', {
        body: {
          action: 'connect',
          instanceToken: instanceToken,
        },
      });

      if (connectError || !connectResult?.success) {
        toast.error(connectResult?.error || 'Falha ao gerar QR Code');
        return;
      }

      setQrCode(connectResult.qrcode || null);
      setPairCode(connectResult.paircode || null);
      setStep('qrcode');
      
      // Iniciar verificação de status
      startStatusCheck(instanceToken);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar instância');
    },
  });

  // Verificar status de conexão periodicamente
  const startStatusCheck = async (instanceToken: string) => {
    setCheckingStatus(true);
    
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('uazapi-connect', {
          body: {
            action: 'status',
            instanceToken,
          },
        });

        console.log('[ConnectionWizard] Status check response:', data);

        // Verificar se realmente está conectado - precisa ser explicitamente true
        const isConnected = data?.success && (data?.connected === true || data?.loggedIn === true || data?.status === 'open');
        
        if (!error && isConnected) {
          setIsConnected(true);
          setCheckingStatus(false);
          setStep('success');

          queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
          toast.success('WhatsApp conectado com sucesso!');
          return true;
        }
        
        // Se tem QR code novo, atualizar
        if (data?.qrcode) {
          setQrCode(data.qrcode);
        }
        if (data?.paircode) {
          setPairCode(data.paircode);
        }
        
        return false;
      } catch (e) {
        console.error('Erro ao verificar status:', e);
        return false;
      }
    };

    // Verificar a cada 3 segundos por 2 minutos
    let attempts = 0;
    const maxAttempts = 40;
    
    const interval = setInterval(async () => {
      attempts++;
      const connected = await checkStatus();
      
      if (connected || attempts >= maxAttempts) {
        clearInterval(interval);
        setCheckingStatus(false);
        
        if (!connected && attempts >= maxAttempts) {
          toast.error('Tempo esgotado. Tente novamente.');
        }
      }
    }, 3000);
  };

  const handleIntentionChange = (intentionId: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      intentions: checked 
        ? [...prev.intentions, intentionId]
        : prev.intentions.filter(i => i !== intentionId),
    }));
  };

  const handleClose = () => {
    setStep('config');
    setQrCode(null);
    setPairCode(null);
    setInstanceData(null);
    setIsConnected(false);
    setCheckingStatus(false);
    setConfig({
      name: '',
      operationType: 'cobranca',
      operationMode: 'autonomous',
      intentions: ['cobranca'],
    });
    onOpenChange(false);
    if (isConnected) onSuccess?.();
  };

  const isConfigValid = config.name.trim() && config.intentions.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {step === 'config' && 'Conectar WhatsApp'}
            {step === 'qrcode' && 'Escaneie o QR Code'}
            {step === 'success' && 'WhatsApp Conectado!'}
          </DialogTitle>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-6">
            {/* Nome da Instância */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do WhatsApp</Label>
              <Input
                id="name"
                placeholder="Ex: Cobrança Principal"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>


            {/* Tipo de Operação */}
            <div className="space-y-3">
              <Label>Tipo de Operação</Label>
              <RadioGroup 
                value={config.operationType} 
                onValueChange={(v: any) => setConfig(prev => ({ ...prev, operationType: v }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cobranca" id="cobranca" />
                  <Label htmlFor="cobranca" className="cursor-pointer">Cobrança</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="atendimento" id="atendimento" />
                  <Label htmlFor="atendimento" className="cursor-pointer">Atendimento</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="coach" id="coach" />
                  <Label htmlFor="coach" className="cursor-pointer">Coach IA</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Modo de Operação */}
            <div className="space-y-3">
              <Label>Modo de Operação</Label>
              <RadioGroup 
                value={config.operationMode} 
                onValueChange={(v: any) => setConfig(prev => ({ ...prev, operationMode: v }))}
                className="grid gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="autonomous" id="autonomous" />
                  <Label htmlFor="autonomous" className="cursor-pointer">
                    IA Autônoma <span className="text-muted-foreground text-sm">(responde sozinha)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="notifications" id="notifications" />
                  <Label htmlFor="notifications" className="cursor-pointer">
                    Apenas Notificações <span className="text-muted-foreground text-sm">(workflow)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid" className="cursor-pointer">
                    Híbrido <span className="text-muted-foreground text-sm">(IA + Humano)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Intenções */}
            <div className="space-y-3">
              <Label>Intenções Principais</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTENTIONS.map((intention) => (
                  <div key={intention.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={intention.id}
                      checked={config.intentions.includes(intention.id)}
                      onCheckedChange={(checked) => handleIntentionChange(intention.id, !!checked)}
                    />
                    <Label htmlFor={intention.id} className="cursor-pointer text-sm">
                      {intention.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => createInstanceMutation.mutate()}
              disabled={!isConfigValid || createInstanceMutation.isPending}
            >
              {createInstanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'qrcode' && (
          <div className="space-y-6 text-center">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg inline-block mx-auto">
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 object-contain"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp no seu celular e escaneie o QR Code
              </p>
              
              {pairCode && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Ou use o código:</p>
                  <p className="text-2xl font-mono font-bold tracking-wider">{pairCode}</p>
                </div>
              )}
            </div>

            {/* Status de Conexão */}
            <div className="flex items-center justify-center gap-2 text-sm">
              {checkingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Aguardando conexão...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Não conectado</span>
                </>
              )}
            </div>

            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">WhatsApp Conectado!</h3>
              <p className="text-sm text-muted-foreground">
                Sua instância "{config.name}" está pronta para uso.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>

            <Button onClick={handleClose} className="w-full">
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
