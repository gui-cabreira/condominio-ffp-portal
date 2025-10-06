-- Tabela de configurações de API keys e integrações
CREATE TABLE IF NOT EXISTS public.workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar workflow_id nas cobranças
ALTER TABLE public.charges 
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflows(id);

-- Tabela de solicitações de novos boletos
CREATE TABLE IF NOT EXISTS public.boleto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  new_charge_id UUID REFERENCES public.charges(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico/timeline de cobranças
CREATE TABLE IF NOT EXISTS public.charge_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id UUID NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created, sent, opened, paid, overdue, request_new, approved, rejected
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_charges_workflow ON public.charges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_boleto_requests_charge ON public.boleto_requests(charge_id);
CREATE INDEX IF NOT EXISTS idx_charge_timeline_charge ON public.charge_timeline(charge_id);

-- RLS para workflow_config
ALTER TABLE public.workflow_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workflow config"
ON public.workflow_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS para boleto_requests
ALTER TABLE public.boleto_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON public.boleto_requests
FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Admins and supervisors can view all requests"
ON public.boleto_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Users can create requests"
ON public.boleto_requests
FOR INSERT
TO authenticated
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins and supervisors can update requests"
ON public.boleto_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
  )
);

-- RLS para charge_timeline
ALTER TABLE public.charge_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view timeline"
ON public.charge_timeline
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create timeline events"
ON public.charge_timeline
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_workflow_config_updated_at
BEFORE UPDATE ON public.workflow_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boleto_requests_updated_at
BEFORE UPDATE ON public.boleto_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();