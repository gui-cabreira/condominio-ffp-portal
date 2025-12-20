-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- ADDITIONAL TABLES NEEDED
-- =============================================

-- Administrator Sync Config
CREATE TABLE public.administrator_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'daily',
  sync_time TIME DEFAULT '03:00:00',
  auth_type TEXT DEFAULT 'credentials',
  notify_on_error BOOLEAN DEFAULT true,
  notify_on_success BOOLEAN DEFAULT false,
  next_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.administrator_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync config" ON public.administrator_sync_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage sync config" ON public.administrator_sync_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Administrator Sync Logs
CREATE TABLE public.administrator_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  new_condominiums INTEGER DEFAULT 0,
  new_units INTEGER DEFAULT 0,
  new_charges INTEGER DEFAULT 0,
  updated_condominiums INTEGER DEFAULT 0,
  updated_units INTEGER DEFAULT 0,
  updated_charges INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.administrator_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs" ON public.administrator_sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage sync logs" ON public.administrator_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'assistant'))
  );

-- Add last_sync_status to administrators
ALTER TABLE public.administrators ADD COLUMN IF NOT EXISTS last_sync_status TEXT;
ALTER TABLE public.administrators ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Workflow Loops Table
CREATE TABLE public.workflow_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  max_iterations INTEGER DEFAULT 10,
  condition_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_loops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow loops" ON public.workflow_loops
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflow loops" ON public.workflow_loops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Automation Workflows Table
CREATE TABLE public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  platform_name TEXT,
  management_system_id UUID REFERENCES public.management_systems(id),
  workflow_steps JSONB DEFAULT '[]',
  timeout_ms INTEGER DEFAULT 30000,
  active BOOLEAN DEFAULT true,
  tested BOOLEAN DEFAULT false,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation workflows" ON public.automation_workflows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage automation workflows" ON public.automation_workflows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Automation Statistics Table
CREATE TABLE public.automation_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_records_extracted INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation stats" ON public.automation_statistics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Automation Actions Table
CREATE TABLE public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  action_type TEXT NOT NULL,
  config_schema JSONB DEFAULT '{}',
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation actions" ON public.automation_actions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Automation Executions Table
CREATE TABLE public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES public.administrators(id),
  status TEXT DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  records_extracted INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  screenshots JSONB DEFAULT '[]',
  execution_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation executions" ON public.automation_executions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage automation executions" ON public.automation_executions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create storage bucket for boletos
INSERT INTO storage.buckets (id, name, public) VALUES ('boletos', 'boletos', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for boletos bucket
CREATE POLICY "Authenticated users can upload boletos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'boletos');

CREATE POLICY "Authenticated users can view boletos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'boletos');

-- Add triggers for updated_at on new tables
CREATE TRIGGER update_administrator_sync_config_updated_at BEFORE UPDATE ON public.administrator_sync_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_automation_statistics_updated_at BEFORE UPDATE ON public.automation_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();