import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Settings } from 'lucide-react';

export default function NegotiationParameters() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parameters, setParameters] = useState({
    default_fees_rate: 10.0,
    default_interest_rate: 2.0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('negotiation_parameters')
        .select('*');

      if (error) throw error;

      const params: Record<string, number> = {};
      data?.forEach(param => {
        params[param.parameter_key] = typeof param.parameter_value === 'string' 
          ? parseFloat(param.parameter_value)
          : param.parameter_value;
      });

      setParameters(prev => ({ ...prev, ...params }));
    } catch (error) {
      console.error('Error loading parameters:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar parâmetros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Atualizar taxa de honorários
      const { error: feesError } = await supabase
        .from('negotiation_parameters')
        .update({ parameter_value: parameters.default_fees_rate })
        .eq('parameter_key', 'default_fees_rate');

      if (feesError) throw feesError;

      // Atualizar taxa de juros
      const { error: interestError } = await supabase
        .from('negotiation_parameters')
        .update({ parameter_value: parameters.default_interest_rate })
        .eq('parameter_key', 'default_interest_rate');

      if (interestError) throw interestError;

      toast({
        title: 'Sucesso',
        description: 'Parâmetros atualizados com sucesso!',
      });
    } catch (error) {
      console.error('Error saving parameters:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar parâmetros',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/portal/corporativo/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Parâmetros de Negociação
            </h1>
            <p className="text-muted-foreground">Configure as taxas padrão para cálculos automáticos</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Taxas Padrão</CardTitle>
            <CardDescription>
              Estes valores serão usados automaticamente ao criar novas negociações. Você pode ajustá-los para cada negociação específica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fees_rate">Taxa de Honorários (%)</Label>
              <Input
                id="fees_rate"
                type="number"
                step="0.01"
                value={parameters.default_fees_rate}
                onChange={(e) => setParameters({
                  ...parameters,
                  default_fees_rate: parseFloat(e.target.value) || 0
                })}
                placeholder="10.00"
              />
              <p className="text-xs text-muted-foreground">
                Percentual de honorários aplicado sobre o valor principal
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest_rate">Taxa de Juros ao Mês (%)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                value={parameters.default_interest_rate}
                onChange={(e) => setParameters({
                  ...parameters,
                  default_interest_rate: parseFloat(e.target.value) || 0
                })}
                placeholder="2.00"
              />
              <p className="text-xs text-muted-foreground">
                Taxa de juros mensal aplicada sobre atrasos
              </p>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Parâmetros
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-blue-600">ℹ️</div>
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-medium">Como funciona o cálculo automático:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>O <strong>valor principal</strong> é o valor original da cobrança</li>
                  <li>Os <strong>honorários</strong> são calculados sobre o valor principal</li>
                  <li>Os <strong>juros</strong> são calculados proporcionalmente aos meses de atraso</li>
                  <li>O <strong>valor total</strong> é a soma: principal + honorários + juros</li>
                </ul>
                <p className="mt-3 text-xs">
                  Exemplo: R$ 1.000 (principal) + R$ 100 (10% honorários) + R$ 20 (2% juros/mês) = R$ 1.120
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
