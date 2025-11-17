-- Sistema Avançado de Automação de Navegador

-- Tabela de workflows de automação (templates de navegação)
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_system_id UUID REFERENCES public.management_systems(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  platform_name TEXT NOT NULL, -- 'lello', 'superlogica', 'sindico_web', etc
  version TEXT DEFAULT '1.0',

  -- Workflow completo de ações
  workflow_steps JSONB NOT NULL, -- Array de steps de automação

  -- Configurações de execução
  timeout_ms INTEGER DEFAULT 60000,
  max_retries INTEGER DEFAULT 3,
  screenshot_on_error BOOLEAN DEFAULT true,
  screenshot_on_success BOOLEAN DEFAULT false,

  -- Mapeamento de dados
  data_mapping JSONB, -- Como mapear dados extraídos para nosso schema

  -- Validações
  validation_rules JSONB, -- Regras para validar dados extraídos

  -- Status
  active BOOLEAN DEFAULT true,
  tested BOOLEAN DEFAULT false,
  success_rate NUMERIC(5,2) DEFAULT 0.00, -- Taxa de sucesso em %

  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  last_tested_at TIMESTAMPTZ,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(management_system_id, platform_name, version)
);

-- Índices
CREATE INDEX idx_automation_workflows_platform ON public.automation_workflows(platform_name);
CREATE INDEX idx_automation_workflows_active ON public.automation_workflows(active);
CREATE INDEX idx_automation_workflows_system_id ON public.automation_workflows(management_system_id);

-- Comentários
COMMENT ON TABLE public.automation_workflows IS 'Workflows de automação de navegador por plataforma';
COMMENT ON COLUMN public.automation_workflows.workflow_steps IS 'Array de passos: [{action, selector, value, waitFor, extract, ...}]';
COMMENT ON COLUMN public.automation_workflows.data_mapping IS 'Mapeamento de campos extraídos para schema do banco';
COMMENT ON COLUMN public.automation_workflows.success_rate IS 'Taxa de sucesso das execuções (atualizado automaticamente)';

-- Tabela de execuções de automação
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  administrator_id UUID REFERENCES public.administrators(id) ON DELETE CASCADE,
  sync_log_id UUID REFERENCES public.administrator_sync_logs(id) ON DELETE SET NULL,

  -- Status da execução
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Dados da execução
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  steps_log JSONB, -- Log detalhado de cada step

  -- Resultados
  extracted_data JSONB, -- Dados extraídos durante a execução
  records_extracted INTEGER DEFAULT 0,

  -- Screenshots e evidências
  screenshots JSONB, -- Array de URLs de screenshots
  downloaded_files JSONB, -- Array de arquivos baixados

  -- Erros
  error_message TEXT,
  error_step INTEGER,
  error_screenshot TEXT, -- URL do screenshot no momento do erro

  -- Metadados
  browser_info JSONB, -- Informações do navegador usado
  execution_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_automation_executions_workflow ON public.automation_executions(workflow_id);
CREATE INDEX idx_automation_executions_admin ON public.automation_executions(administrator_id);
CREATE INDEX idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX idx_automation_executions_started ON public.automation_executions(started_at DESC);

-- Comentários
COMMENT ON TABLE public.automation_executions IS 'Histórico de execuções de workflows de automação';
COMMENT ON COLUMN public.automation_executions.steps_log IS 'Log detalhado: [{step, action, status, duration, result}]';
COMMENT ON COLUMN public.automation_executions.screenshots IS 'URLs de screenshots capturados durante execução';

-- Tabela de ações disponíveis (catálogo)
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  action_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'navigation', 'interaction', 'extraction', 'validation', 'utility'

  -- Schema da ação (parâmetros esperados)
  parameters_schema JSONB,

  -- Exemplos de uso
  examples JSONB,

  -- Disponibilidade
  available BOOLEAN DEFAULT true,
  requires_pro BOOLEAN DEFAULT false, -- Se requer serviço pago

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.automation_actions IS 'Catálogo de ações disponíveis para workflows';
COMMENT ON COLUMN public.automation_actions.parameters_schema IS 'JSON Schema dos parâmetros da ação';

-- Inserir ações disponíveis
INSERT INTO public.automation_actions (action_type, display_name, description, category, parameters_schema, examples) VALUES
  ('navigate', 'Navegar para URL', 'Navega para uma URL específica', 'navigation',
   '{"url": "string (required)", "waitUntil": "load|domcontentloaded|networkidle0|networkidle2"}',
   '[{"url": "https://app.lello.com.br/login", "waitUntil": "networkidle0"}]'),

  ('click', 'Clicar em Elemento', 'Clica em um elemento da página', 'interaction',
   '{"selector": "string (required)", "waitForSelector": "boolean", "timeout": "number"}',
   '[{"selector": "button.login-btn", "waitForSelector": true, "timeout": 5000}]'),

  ('type', 'Digitar Texto', 'Digita texto em um campo de entrada', 'interaction',
   '{"selector": "string (required)", "value": "string (required)", "delay": "number", "clear": "boolean"}',
   '[{"selector": "#email", "value": "${username}", "clear": true}]'),

  ('wait', 'Aguardar', 'Aguarda por tempo ou elemento', 'utility',
   '{"type": "time|selector|navigation", "value": "number|string", "timeout": "number"}',
   '[{"type": "selector", "value": ".dashboard-loaded", "timeout": 10000}]'),

  ('extract_text', 'Extrair Texto', 'Extrai texto de elemento(s)', 'extraction',
   '{"selector": "string (required)", "multiple": "boolean", "attribute": "string"}',
   '[{"selector": ".balance-value", "attribute": "textContent"}]'),

  ('extract_table', 'Extrair Tabela', 'Extrai dados de uma tabela HTML', 'extraction',
   '{"selector": "string (required)", "columns": "object (required)", "skipRows": "number"}',
   '[{"selector": "table.inadimplentes", "columns": {"name": "td:nth-child(1)", "value": "td:nth-child(2)"}}]'),

  ('screenshot', 'Capturar Screenshot', 'Captura screenshot da página', 'utility',
   '{"fullPage": "boolean", "selector": "string", "name": "string"}',
   '[{"fullPage": true, "name": "dashboard.png"}]'),

  ('download', 'Baixar Arquivo', 'Clica para baixar arquivo', 'utility',
   '{"selector": "string (required)", "waitForDownload": "boolean", "timeout": "number"}',
   '[{"selector": "a.download-csv", "waitForDownload": true, "timeout": 30000}]'),

  ('evaluate', 'Executar JavaScript', 'Executa código JavaScript na página', 'utility',
   '{"script": "string (required)", "args": "array"}',
   '[{"script": "return document.querySelector(\".total\").textContent"}]'),

  ('select', 'Selecionar Opção', 'Seleciona opção em dropdown/select', 'interaction',
   '{"selector": "string (required)", "value": "string (required)"}',
   '[{"selector": "#month-select", "value": "2024-01"}]'),

  ('check', 'Marcar Checkbox', 'Marca/desmarca checkbox', 'interaction',
   '{"selector": "string (required)", "checked": "boolean"}',
   '[{"selector": "#accept-terms", "checked": true}]'),

  ('hover', 'Passar Mouse', 'Move mouse sobre elemento', 'interaction',
   '{"selector": "string (required)", "waitAfter": "number"}',
   '[{"selector": ".dropdown-menu", "waitAfter": 500}]'),

  ('scroll', 'Rolar Página', 'Rola a página', 'interaction',
   '{"type": "bottom|top|element", "selector": "string", "offset": "number"}',
   '[{"type": "element", "selector": "#load-more"}]'),

  ('validate', 'Validar Condição', 'Valida condição e aborta se falhar', 'validation',
   '{"type": "exists|not_exists|equals|contains", "selector": "string", "value": "string"}',
   '[{"type": "exists", "selector": ".success-message"}]'),

  ('loop', 'Loop/Iteração', 'Repete ações em múltiplos elementos', 'utility',
   '{"selector": "string (required)", "actions": "array (required)", "maxIterations": "number"}',
   '[{"selector": ".pagination-next", "actions": [...], "maxIterations": 10}]'),

  ('conditional', 'Condicional If/Else', 'Executa ações condicionalmente', 'utility',
   '{"condition": "object (required)", "thenActions": "array", "elseActions": "array"}',
   '[{"condition": {"selector": ".error"}, "thenActions": [...], "elseActions": [...]}]')

ON CONFLICT (action_type) DO NOTHING;

-- Adicionar colunas para rastrear automação
ALTER TABLE public.management_system_templates
  ADD COLUMN IF NOT EXISTS automation_workflow_id UUID REFERENCES public.automation_workflows(id),
  ADD COLUMN IF NOT EXISTS supports_automation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_tested BOOLEAN DEFAULT false;

-- RLS Policies
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

-- Policies para workflows
CREATE POLICY "Users can view automation workflows"
  ON public.automation_workflows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage automation workflows"
  ON public.automation_workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policies para executions
CREATE POLICY "Users can view automation executions"
  ON public.automation_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage automation executions"
  ON public.automation_executions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policies para actions (somente leitura para todos)
CREATE POLICY "Users can view automation actions"
  ON public.automation_actions FOR SELECT
  USING (available = true);

-- Triggers
CREATE TRIGGER update_automation_workflows_updated_at
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_actions_updated_at
  BEFORE UPDATE ON public.automation_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar taxa de sucesso
CREATE OR REPLACE FUNCTION update_workflow_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE automation_workflows
  SET success_rate = (
    SELECT
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC * 100)
      END
    FROM automation_executions
    WHERE workflow_id = NEW.workflow_id
  )
  WHERE id = NEW.workflow_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_success_rate_trigger
  AFTER INSERT OR UPDATE ON public.automation_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed', 'timeout'))
  EXECUTE FUNCTION update_workflow_success_rate();

-- View para estatísticas de automação
CREATE OR REPLACE VIEW automation_statistics AS
SELECT
  aw.id AS workflow_id,
  aw.name AS workflow_name,
  aw.platform_name,
  ms.name AS management_system_name,
  aw.success_rate,
  aw.tested,
  aw.active,
  COUNT(ae.id) AS total_executions,
  COUNT(ae.id) FILTER (WHERE ae.status = 'completed') AS successful_executions,
  COUNT(ae.id) FILTER (WHERE ae.status = 'failed') AS failed_executions,
  COUNT(ae.id) FILTER (WHERE ae.status = 'timeout') AS timeout_executions,
  AVG(ae.duration_ms) AS avg_duration_ms,
  MAX(ae.started_at) AS last_execution_at,
  SUM(ae.records_extracted) AS total_records_extracted
FROM automation_workflows aw
LEFT JOIN management_systems ms ON aw.management_system_id = ms.id
LEFT JOIN automation_executions ae ON aw.id = ae.workflow_id
GROUP BY aw.id, aw.name, aw.platform_name, ms.name, aw.success_rate, aw.tested, aw.active;

-- Comentários na view
COMMENT ON VIEW automation_statistics IS 'Estatísticas agregadas de workflows de automação';

-- Inserir workflows exemplo para plataformas principais
INSERT INTO public.automation_workflows (
  management_system_id,
  name,
  description,
  platform_name,
  workflow_steps,
  data_mapping,
  timeout_ms
)
SELECT
  ms.id,
  'Lello - Extração de Inadimplentes',
  'Workflow de automação para extrair inadimplentes da plataforma Lello',
  'lello',
  '[
    {"action": "navigate", "url": "https://app.lello.com.br/login", "waitUntil": "networkidle0"},
    {"action": "type", "selector": "#email", "value": "${username}", "clear": true},
    {"action": "type", "selector": "#password", "value": "${password}", "clear": true},
    {"action": "click", "selector": "button[type=\"submit\"]"},
    {"action": "wait", "type": "selector", "value": ".dashboard-container", "timeout": 10000},
    {"action": "screenshot", "name": "dashboard.png", "fullPage": false},
    {"action": "navigate", "url": "https://app.lello.com.br/financeiro/inadimplentes", "waitUntil": "networkidle2"},
    {"action": "wait", "type": "selector", "value": "table.inadimplentes", "timeout": 5000},
    {"action": "extract_table", "selector": "table.inadimplentes", "columns": {
      "condominio": "td:nth-child(1)",
      "unidade": "td:nth-child(2)",
      "proprietario": "td:nth-child(3)",
      "cpf": "td:nth-child(4)",
      "valor": "td:nth-child(5)",
      "vencimento": "td:nth-child(6)",
      "referencia": "td:nth-child(7)"
    }},
    {"action": "screenshot", "name": "inadimplentes.png", "fullPage": true}
  ]'::jsonb,
  '{
    "condominio": "condominium_name",
    "unidade": "unit_number",
    "proprietario": "owner_name",
    "cpf": "owner_cpf",
    "valor": "amount",
    "vencimento": "due_date",
    "referencia": "reference_month"
  }'::jsonb,
  90000
FROM management_systems ms
WHERE ms.name = 'Lello'
ON CONFLICT DO NOTHING;

-- Workflow para Superlógica
INSERT INTO public.automation_workflows (
  management_system_id,
  name,
  description,
  platform_name,
  workflow_steps,
  data_mapping,
  timeout_ms
)
SELECT
  ms.id,
  'Superlógica - Extração de Inadimplentes',
  'Workflow de automação para extrair inadimplentes da plataforma Superlógica',
  'superlogica',
  '[
    {"action": "navigate", "url": "https://portal.superlogica.net/clients/areadocliente", "waitUntil": "networkidle0"},
    {"action": "type", "selector": "input[name=\"username\"]", "value": "${username}", "clear": true},
    {"action": "type", "selector": "input[name=\"password\"]", "value": "${password}", "clear": true},
    {"action": "click", "selector": "button.btn-login"},
    {"action": "wait", "type": "selector", "value": ".main-dashboard", "timeout": 10000},
    {"action": "click", "selector": "a[href*=\"financeiro\"]"},
    {"action": "wait", "type": "time", "value": 2000},
    {"action": "click", "selector": "a[href*=\"inadimplentes\"]"},
    {"action": "wait", "type": "selector", "value": "table.table-inadimplentes", "timeout": 5000},
    {"action": "extract_table", "selector": "table.table-inadimplentes", "columns": {
      "condominio": "td[data-label=\"Condomínio\"]",
      "unidade": "td[data-label=\"Unidade\"]",
      "nome": "td[data-label=\"Condômino\"]",
      "valor": "td[data-label=\"Valor\"]",
      "vencimento": "td[data-label=\"Vencimento\"]"
    }},
    {"action": "screenshot", "name": "superlogica_inadimplentes.png", "fullPage": true}
  ]'::jsonb,
  '{
    "condominio": "condominium_name",
    "unidade": "unit_number",
    "nome": "owner_name",
    "valor": "amount",
    "vencimento": "due_date"
  }'::jsonb,
  90000
FROM management_systems ms
WHERE ms.name = 'Superlógica'
ON CONFLICT DO NOTHING;

-- Inserir sistema Lello se não existir
INSERT INTO public.management_systems (name, description, active)
VALUES ('Lello', 'Plataforma Lello de gestão condominial', true)
ON CONFLICT (name) DO NOTHING;

-- Inserir sistema Síndico Web se não existir
INSERT INTO public.management_systems (name, description, active)
VALUES ('Síndico Web', 'Plataforma Síndico Web de gestão condominial', true)
ON CONFLICT (name) DO NOTHING;
