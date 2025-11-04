-- Adicionar campos de Torre e Bloco na tabela units
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS tower TEXT,
ADD COLUMN IF NOT EXISTS block TEXT;

-- Adicionar campos de cálculo na tabela charges
ALTER TABLE public.charges 
ADD COLUMN IF NOT EXISTS principal_amount NUMERIC,
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_with_fees NUMERIC;

-- Criar tabela de parametrização de negociações
CREATE TABLE IF NOT EXISTS public.negotiation_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key TEXT UNIQUE NOT NULL,
  parameter_value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir parâmetros padrão
INSERT INTO public.negotiation_parameters (parameter_key, parameter_value, description)
VALUES 
  ('default_fees_rate', 10.0, 'Taxa padrão de honorários (%)'),
  ('default_interest_rate', 2.0, 'Taxa padrão de juros ao mês (%)')
ON CONFLICT (parameter_key) DO NOTHING;

-- RLS para negotiation_parameters
ALTER TABLE public.negotiation_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage parameters" 
ON public.negotiation_parameters 
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view parameters" 
ON public.negotiation_parameters 
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_negotiation_parameters_updated_at
BEFORE UPDATE ON public.negotiation_parameters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();