-- Tabela para registrar bugs/issues do sistema
CREATE TABLE public.system_bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabela para logs de login
CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabela para logs operacionais do sistema
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('auth', 'data', 'workflow', 'import', 'export', 'system')),
  description text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_system_bugs_status ON public.system_bugs(status);
CREATE INDEX idx_system_bugs_severity ON public.system_bugs(severity);
CREATE INDEX idx_system_bugs_reported_by ON public.system_bugs(reported_by);
CREATE INDEX idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_login_at ON public.login_logs(login_at DESC);
CREATE INDEX idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_bugs_updated_at
  BEFORE UPDATE ON public.system_bugs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.system_bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e gerenciar bugs
CREATE POLICY "Admins can manage bugs"
  ON public.system_bugs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Todos usuários autenticados podem reportar bugs
CREATE POLICY "Users can report bugs"
  ON public.system_bugs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND reported_by = auth.uid());

-- Usuários podem ver seus próprios bugs
CREATE POLICY "Users can view their own bugs"
  ON public.system_bugs
  FOR SELECT
  USING (reported_by = auth.uid());

-- Apenas admins podem ver todos os logs de login
CREATE POLICY "Admins can view all login logs"
  ON public.login_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Sistema pode inserir logs de login
CREATE POLICY "System can insert login logs"
  ON public.login_logs
  FOR INSERT
  WITH CHECK (true);

-- Usuários podem ver seus próprios logs de login
CREATE POLICY "Users can view their own login logs"
  ON public.login_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Apenas admins podem ver logs do sistema
CREATE POLICY "Admins can view system logs"
  ON public.system_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Sistema pode inserir logs
CREATE POLICY "System can insert logs"
  ON public.system_logs
  FOR INSERT
  WITH CHECK (true);

-- View para estatísticas de login
CREATE OR REPLACE VIEW public.login_statistics AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(ll.id) as total_logins,
  MAX(ll.login_at) as last_login,
  COUNT(CASE WHEN ll.success = false THEN 1 END) as failed_attempts
FROM auth.users u
LEFT JOIN public.login_logs ll ON u.id = ll.user_id
GROUP BY u.id, u.email;