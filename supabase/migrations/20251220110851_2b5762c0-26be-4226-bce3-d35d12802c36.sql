-- Tabela para instâncias UAZAPI
CREATE TABLE public.uazapi_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instance_id TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT 'https://api.uazapi.com',
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  phone_number TEXT,
  is_default BOOLEAN DEFAULT false,
  instance_type TEXT DEFAULT 'general', -- general, coach, notification
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para vincular colaboradores a instâncias de coach
CREATE TABLE public.employee_coach_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID REFERENCES public.uazapi_instances(id) ON DELETE CASCADE,
  coach_agent_id UUID REFERENCES public.coach_agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  last_activity_at TIMESTAMPTZ,
  total_conversations INTEGER DEFAULT 0,
  total_images_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para análise de imagens do coach
CREATE TABLE public.coach_image_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.coaching_messages(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_result JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
  ai_response TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.uazapi_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_coach_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_image_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas para uazapi_instances
CREATE POLICY "Admins can manage instances" ON public.uazapi_instances
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view instances" ON public.uazapi_instances
  FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para employee_coach_instances
CREATE POLICY "Admins can manage employee instances" ON public.employee_coach_instances
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own instance" ON public.employee_coach_instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own instance" ON public.employee_coach_instances
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para coach_image_analyses
CREATE POLICY "Admins can manage analyses" ON public.coach_image_analyses
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view analyses" ON public.coach_image_analyses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_uazapi_instances_updated_at
  BEFORE UPDATE ON public.uazapi_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_coach_instances_updated_at
  BEFORE UPDATE ON public.employee_coach_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_uazapi_instances_type ON public.uazapi_instances(instance_type);
CREATE INDEX idx_employee_coach_user ON public.employee_coach_instances(user_id);
CREATE INDEX idx_coach_image_session ON public.coach_image_analyses(session_id);