-- Tabela para armazenar tokens de integração externa
CREATE TABLE public.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  token text NOT NULL UNIQUE,
  token_prefix text NOT NULL, -- Primeiros 8 caracteres para exibição
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  usage_count integer DEFAULT 0,
  expires_at timestamptz,
  allowed_actions text[] DEFAULT ARRAY['upsert_administrator', 'upsert_condominium', 'upsert_unit', 'upsert_charges', 'upsert_agreement', 'upsert_extrajudicial', 'bulk_import'],
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_integration_tokens_token ON integration_tokens(token);
CREATE INDEX idx_integration_tokens_active ON integration_tokens(is_active);

-- RLS
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_tokens_select" ON integration_tokens 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "integration_tokens_insert" ON integration_tokens 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "integration_tokens_update" ON integration_tokens 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "integration_tokens_delete" ON integration_tokens 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
  );

-- Trigger para updated_at
CREATE TRIGGER update_integration_tokens_updated_at
  BEFORE UPDATE ON integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de logs de uso dos tokens
CREATE TABLE public.integration_token_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES integration_tokens(id) ON DELETE CASCADE,
  action text NOT NULL,
  request_ip text,
  request_payload jsonb,
  response_status integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_token_logs_token ON integration_token_logs(token_id);
CREATE INDEX idx_token_logs_created ON integration_token_logs(created_at DESC);

ALTER TABLE integration_token_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_logs_select" ON integration_token_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
  );