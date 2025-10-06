import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Key, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

type ConfigKey = {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  encrypted: boolean;
};

const predefinedConfigs = [
  {
    key: 'whatsapp_api_key',
    description: 'API Key do WhatsApp Business',
    encrypted: true,
  },
  {
    key: 'whatsapp_phone',
    description: 'Número de telefone do WhatsApp Business',
    encrypted: false,
  },
  {
    key: 'email_smtp_host',
    description: 'Servidor SMTP para envio de e-mails',
    encrypted: false,
  },
  {
    key: 'email_smtp_port',
    description: 'Porta SMTP',
    encrypted: false,
  },
  {
    key: 'email_smtp_user',
    description: 'Usuário SMTP',
    encrypted: false,
  },
  {
    key: 'email_smtp_password',
    description: 'Senha SMTP',
    encrypted: true,
  },
  {
    key: 'sms_api_key',
    description: 'API Key do provedor de SMS',
    encrypted: true,
  },
  {
    key: 'sms_sender_name',
    description: 'Nome do remetente SMS',
    encrypted: false,
  },
];

const WorkflowSettings = () => {
  const { toast } = useToast();
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['workflow-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_config')
        .select('*')
        .order('key');

      if (error) throw error;
      return data as ConfigKey[];
    },
  });

  // Inicializar predefinidos se não existirem
  React.useEffect(() => {
    const initializeConfigs = async () => {
      if (!configs) return;

      const existingKeys = new Set(configs.map(c => c.key));
      const missingConfigs = predefinedConfigs.filter(pc => !existingKeys.has(pc.key));

      if (missingConfigs.length > 0) {
        const { error } = await supabase
          .from('workflow_config')
          .insert(
            missingConfigs.map(mc => ({
              key: mc.key,
              description: mc.description,
              encrypted: mc.encrypted,
              value: null,
            }))
          );

        if (!error) {
          refetch();
        }
      }
    };

    initializeConfigs();
  }, [configs]);

  const handleSave = async (configKey: string) => {
    const value = formValues[configKey];
    if (value === undefined) return;

    try {
      const { error } = await supabase
        .from('workflow_config')
        .update({ value })
        .eq('key', configKey);

      if (error) throw error;

      toast({
        title: 'Configuração salva',
        description: 'A configuração foi atualizada com sucesso.',
      });

      refetch();
      setFormValues(prev => ({ ...prev, [configKey]: '' }));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return <div className="p-6">Carregando configurações...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ffp-navy flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configurações do Workflow
        </h1>
        <p className="text-gray-600 mt-1">
          Configure as API keys e credenciais para integrações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {configs?.map((config) => {
          const configDef = predefinedConfigs.find(pc => pc.key === config.key);
          const isEncrypted = config.encrypted;
          const shouldShow = showValues[config.key];

          return (
            <Card key={config.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {config.description || config.key}
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  {config.key}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.value && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Valor atual:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleShowValue(config.key)}
                      >
                        {shouldShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="mt-2 text-sm font-mono break-all">
                      {isEncrypted && !shouldShow ? '••••••••••••••••' : config.value}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={config.key}>
                    {config.value ? 'Novo valor' : 'Valor'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={config.key}
                      type={isEncrypted && !shouldShow ? 'password' : 'text'}
                      value={formValues[config.key] || ''}
                      onChange={(e) =>
                        setFormValues(prev => ({ ...prev, [config.key]: e.target.value }))
                      }
                      placeholder={`Digite ${isEncrypted ? 'a chave' : 'o valor'}...`}
                    />
                    <Button
                      onClick={() => handleSave(config.key)}
                      disabled={!formValues[config.key]}
                      className="bg-ffp-navy hover:bg-ffp-navy-dark"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">🔒 Segurança</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• As chaves marcadas como criptografadas são armazenadas de forma segura</p>
          <p>• Nunca compartilhe suas API keys com terceiros</p>
          <p>• Recomendamos renovar as chaves periodicamente</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowSettings;
