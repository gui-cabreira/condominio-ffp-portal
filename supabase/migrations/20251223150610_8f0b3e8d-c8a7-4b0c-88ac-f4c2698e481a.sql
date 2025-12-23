-- Create negotiation_history table to track all negotiations
CREATE TABLE IF NOT EXISTS public.negotiation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id UUID NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id),
  proposed_amount DECIMAL(12,2) NOT NULL,
  original_amount DECIMAL(12,2) NOT NULL,
  discount_percentage DECIMAL(5,2),
  installments INTEGER DEFAULT 1,
  ai_recommendation TEXT,
  ai_score DECIMAL(3,2),
  ai_analysis JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'counter_proposed', 'expired')),
  proposed_by TEXT,
  proposed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.negotiation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for negotiation_history
CREATE POLICY "Authenticated users can view negotiations"
  ON public.negotiation_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert negotiations"
  ON public.negotiation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update negotiations"
  ON public.negotiation_history
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_negotiation_history_updated_at
  BEFORE UPDATE ON public.negotiation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add negotiation parameters if not exists
INSERT INTO public.negotiation_parameters (parameter_key, parameter_value, description)
VALUES 
  ('max_discount_percentage', '30', 'Desconto máximo permitido em porcentagem'),
  ('min_down_payment_percentage', '20', 'Entrada mínima obrigatória em porcentagem'),
  ('max_installments', '12', 'Número máximo de parcelas'),
  ('interest_rate_monthly', '1', 'Taxa de juros mensal para parcelamento'),
  ('auto_approve_threshold', '15', 'Desconto até este valor é aprovado automaticamente'),
  ('ai_confidence_threshold', '0.7', 'Nível de confiança mínimo da IA para auto-aprovação')
ON CONFLICT DO NOTHING;