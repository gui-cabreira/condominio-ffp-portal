-- Tabela de configuração de agentes/coaches (customizáveis via admin)
CREATE TABLE public.coach_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT NOT NULL DEFAULT 'Você é um coach profissional, empático e motivador.',
  focus_areas JSONB DEFAULT '[]'::jsonb,
  welcome_message TEXT DEFAULT 'Olá! Sou seu coach pessoal. Como posso te ajudar hoje?',
  active BOOLEAN DEFAULT true,
  administrator_id UUID REFERENCES public.administrators(id),
  condominium_id UUID REFERENCES public.condominiums(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.coach_agents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage coach agents"
ON public.coach_agents FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view coach agents"
ON public.coach_agents FOR SELECT
USING (auth.role() = 'authenticated');

-- Sessões de coaching (conversas estruturadas)
CREATE TABLE public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id),
  condominium_id UUID REFERENCES public.condominiums(id),
  coach_agent_id UUID REFERENCES public.coach_agents(id),
  session_type TEXT DEFAULT 'general',
  session_status TEXT DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  session_data JSONB DEFAULT '{}'::jsonb,
  goals JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_interaction_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching sessions"
ON public.coaching_sessions FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view coaching sessions"
ON public.coaching_sessions FOR SELECT
USING (auth.role() = 'authenticated');

-- Progresso e métricas do coaching
CREATE TABLE public.coaching_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching progress"
ON public.coaching_progress FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view coaching progress"
ON public.coaching_progress FOR SELECT
USING (auth.role() = 'authenticated');

-- Biblioteca de conteúdo (PDFs, vídeos, materiais)
CREATE TABLE public.coaching_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'document',
  category TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  coach_agent_id UUID REFERENCES public.coach_agents(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching content"
ON public.coaching_content FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view coaching content"
ON public.coaching_content FOR SELECT
USING (auth.role() = 'authenticated');

-- Mensagens de coaching (histórico de conversas)
CREATE TABLE public.coaching_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  uazapi_message_id TEXT,
  intent TEXT,
  sentiment TEXT,
  confidence NUMERIC,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching messages"
ON public.coaching_messages FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view coaching messages"
ON public.coaching_messages FOR SELECT
USING (auth.role() = 'authenticated');

-- Check-ins periódicos agendados
CREATE TABLE public.coaching_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  checkin_type TEXT NOT NULL DEFAULT 'daily',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  message_template TEXT,
  response TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching checkins"
ON public.coaching_checkins FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::user_role, 'assistant'::user_role]));

CREATE POLICY "Authenticated users can view coaching checkins"
ON public.coaching_checkins FOR SELECT
USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER update_coach_agents_updated_at
BEFORE UPDATE ON public.coach_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_content_updated_at
BEFORE UPDATE ON public.coaching_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_coaching_sessions_phone ON public.coaching_sessions(phone_number);
CREATE INDEX idx_coaching_sessions_unit ON public.coaching_sessions(unit_id);
CREATE INDEX idx_coaching_sessions_condominium ON public.coaching_sessions(condominium_id);
CREATE INDEX idx_coaching_messages_session ON public.coaching_messages(session_id);
CREATE INDEX idx_coaching_progress_session ON public.coaching_progress(session_id);
CREATE INDEX idx_coaching_checkins_scheduled ON public.coaching_checkins(scheduled_at) WHERE status = 'scheduled';