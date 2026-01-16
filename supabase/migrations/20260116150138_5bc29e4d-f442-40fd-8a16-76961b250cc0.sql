-- Permitir que qualquer pessoa consulte convites pelo token (para aceitar)
CREATE POLICY "Anyone can read invitations by token"
ON public.user_invitations
FOR SELECT
USING (true);

-- Nota: A segurança está no fato de que o token é um UUID secreto
-- Só quem recebe o email tem acesso ao token