-- Tabela para armazenar logs de sincronização com administradoras
CREATE TABLE IF NOT EXISTS public.administrator_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Estatísticas da sincronização
  total_records_fetched INTEGER DEFAULT 0,
  new_condominiums INTEGER DEFAULT 0,
  updated_condominiums INTEGER DEFAULT 0,
  new_units INTEGER DEFAULT 0,
  updated_units INTEGER DEFAULT 0,
  new_charges INTEGER DEFAULT 0,
  updated_charges INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Dados detalhados
  raw_data JSONB,
  parsed_data JSONB,
  errors JSONB,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_administrator_sync_logs_admin_id ON public.administrator_sync_logs(administrator_id);
CREATE INDEX idx_administrator_sync_logs_status ON public.administrator_sync_logs(status);
CREATE INDEX idx_administrator_sync_logs_started_at ON public.administrator_sync_logs(started_at DESC);

-- Comentários
COMMENT ON TABLE public.administrator_sync_logs IS 'Logs de sincronização de dados com portais das administradoras';
COMMENT ON COLUMN public.administrator_sync_logs.sync_type IS 'Tipo de sincronização: manual, scheduled (cron), webhook';
COMMENT ON COLUMN public.administrator_sync_logs.raw_data IS 'Dados brutos obtidos do portal da administradora';
COMMENT ON COLUMN public.administrator_sync_logs.parsed_data IS 'Dados parseados e estruturados';
COMMENT ON COLUMN public.administrator_sync_logs.errors IS 'Array de erros encontrados durante a sincronização';

-- Tabela para configurações de sincronização por administradora
CREATE TABLE IF NOT EXISTS public.administrator_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id UUID NOT NULL UNIQUE REFERENCES public.administrators(id) ON DELETE CASCADE,

  -- Configurações de sincronização
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  sync_time TIME DEFAULT '03:00:00', -- Horário para sincronização diária
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Configurações de autenticação/acesso
  auth_type TEXT DEFAULT 'credentials' CHECK (auth_type IN ('credentials', 'api_key', 'oauth', 'scraping')),
  api_endpoint TEXT,
  api_key TEXT,
  requires_2fa BOOLEAN DEFAULT false,

  -- Configurações de parsing
  data_format TEXT DEFAULT 'html' CHECK (data_format IN ('html', 'json', 'xml', 'csv', 'pdf')),
  parsing_rules JSONB, -- Regras customizadas de parsing (seletores CSS, XPath, etc)
  field_mapping JSONB, -- Mapeamento de campos do portal para nosso schema

  -- Configurações de notificações
  notify_on_success BOOLEAN DEFAULT false,
  notify_on_error BOOLEAN DEFAULT true,
  notification_emails TEXT[],

  -- Metadados
  active BOOLEAN DEFAULT true,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_administrator_sync_config_admin_id ON public.administrator_sync_config(administrator_id);
CREATE INDEX idx_administrator_sync_config_auto_sync ON public.administrator_sync_config(auto_sync_enabled, active);
CREATE INDEX idx_administrator_sync_config_next_sync ON public.administrator_sync_config(next_sync_at) WHERE auto_sync_enabled = true AND active = true;

-- Comentários
COMMENT ON TABLE public.administrator_sync_config IS 'Configurações de sincronização automática por administradora';
COMMENT ON COLUMN public.administrator_sync_config.parsing_rules IS 'Regras de parsing específicas (ex: seletores CSS para scraping)';
COMMENT ON COLUMN public.administrator_sync_config.field_mapping IS 'Mapeamento de campos: {"portal_field": "our_field"}';

-- Tabela para templates de scraping/parsing por sistema de gestão
CREATE TABLE IF NOT EXISTS public.management_system_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_system_id UUID NOT NULL REFERENCES public.management_systems(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',

  -- URLs e endpoints
  login_url TEXT,
  dashboard_url TEXT,
  charges_url TEXT,
  condominiums_url TEXT,

  -- Seletores e regras de scraping
  login_form_selectors JSONB, -- Seletores para campos de login
  data_extraction_rules JSONB, -- Regras para extrair dados de cada tipo
  pagination_rules JSONB, -- Regras para navegar páginas

  -- Mapeamento de campos
  field_mappings JSONB,

  -- Tratamento de casos especiais
  special_cases JSONB,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(management_system_id, version)
);

-- Índices
CREATE INDEX idx_management_system_templates_system_id ON public.management_system_templates(management_system_id);
CREATE INDEX idx_management_system_templates_active ON public.management_system_templates(active);

-- Comentários
COMMENT ON TABLE public.management_system_templates IS 'Templates de scraping/parsing por sistema de gestão (Superlógica, etc)';
COMMENT ON COLUMN public.management_system_templates.login_form_selectors IS 'Seletores CSS/XPath para login: {"username": "#user", "password": "#pass"}';
COMMENT ON COLUMN public.management_system_templates.data_extraction_rules IS 'Regras para extrair dados de cada página';

-- Adicionar colunas à tabela administrators se não existirem
ALTER TABLE public.administrators
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial', null)),
  ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- Comentários
COMMENT ON COLUMN public.administrators.last_sync_at IS 'Data/hora da última sincronização bem-sucedida';
COMMENT ON COLUMN public.administrators.last_sync_status IS 'Status da última tentativa de sincronização';

-- RLS Policies
ALTER TABLE public.administrator_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrator_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_system_templates ENABLE ROW LEVEL SECURITY;

-- Policies para administrator_sync_logs
CREATE POLICY "Users can view sync logs"
  ON public.administrator_sync_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sync logs"
  ON public.administrator_sync_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'developer')
    )
  );

-- Policies para administrator_sync_config
CREATE POLICY "Users can view sync config"
  ON public.administrator_sync_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage sync config"
  ON public.administrator_sync_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'developer')
    )
  );

-- Policies para management_system_templates
CREATE POLICY "Users can view templates"
  ON public.management_system_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage templates"
  ON public.management_system_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'developer')
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_administrator_sync_logs_updated_at
  BEFORE UPDATE ON public.administrator_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_administrator_sync_config_updated_at
  BEFORE UPDATE ON public.administrator_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_management_system_templates_updated_at
  BEFORE UPDATE ON public.management_system_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão para Superlógica
INSERT INTO public.management_system_templates (
  management_system_id,
  name,
  description,
  version,
  login_url,
  dashboard_url,
  charges_url,
  login_form_selectors,
  data_extraction_rules,
  field_mappings
)
SELECT
  id,
  'Template Padrão Superlógica',
  'Template de scraping/API para sistema Superlógica',
  '1.0',
  'https://portal.superlogica.net/login',
  'https://portal.superlogica.net/dashboard',
  'https://portal.superlogica.net/financeiro/inadimplentes',
  '{
    "username": "input[name=\"username\"]",
    "password": "input[name=\"password\"]",
    "submit": "button[type=\"submit\"]"
  }'::jsonb,
  '{
    "charges": {
      "table_selector": "table.inadimplentes",
      "row_selector": "tbody tr",
      "columns": {
        "condominio": "td:nth-child(1)",
        "unidade": "td:nth-child(2)",
        "proprietario": "td:nth-child(3)",
        "valor": "td:nth-child(4)",
        "vencimento": "td:nth-child(5)",
        "referencia": "td:nth-child(6)"
      }
    }
  }'::jsonb,
  '{
    "condominio": "condominium_name",
    "unidade": "unit_number",
    "proprietario": "owner_name",
    "valor": "amount",
    "vencimento": "due_date",
    "referencia": "reference_month"
  }'::jsonb
FROM public.management_systems
WHERE name = 'Superlógica'
ON CONFLICT DO NOTHING;
