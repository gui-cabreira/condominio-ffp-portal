-- Adicionar policy para admins poderem atualizar todos os perfis
-- Isso permite que a aprovação de usuários funcione corretamente

CREATE POLICY "Admins can update all profiles" 
ON profiles
FOR UPDATE 
TO public
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));