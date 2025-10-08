-- Adicionar campos de tracking de emails na tabela user_invitations
ALTER TABLE user_invitations
ADD COLUMN IF NOT EXISTS email_id TEXT,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_events JSONB DEFAULT '[]'::jsonb;

-- Adicionar política RLS para permitir deleção de convites por admins
CREATE POLICY "Admins can delete invitations"
ON user_invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);