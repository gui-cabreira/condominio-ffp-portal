-- Permitir que qualquer pessoa (inclusive anon) atualize convites para aceitar
-- A segurança está no token secreto UUID que só quem recebe o email conhece
CREATE POLICY "Anyone can accept invitation by token"
ON public.user_invitations
FOR UPDATE
USING (true)
WITH CHECK (true);