-- Adicionar campos de tracking de email na tabela workflow_execution_steps
ALTER TABLE workflow_execution_steps
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_id TEXT,
ADD COLUMN IF NOT EXISTS error_details JSONB;