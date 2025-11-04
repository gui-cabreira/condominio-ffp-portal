-- Corrigir policy da tabela condominiums para permitir INSERT por admins
-- A policy existente não tinha WITH CHECK, apenas USING, bloqueando INSERTs

DROP POLICY IF EXISTS "Admins can manage all condominiums" ON condominiums;

CREATE POLICY "Admins can manage all condominiums" 
ON condominiums
FOR ALL 
TO public
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Verificar e corrigir outras policies similares se necessário
-- Policy para administrators também precisa de WITH CHECK

DROP POLICY IF EXISTS "Admins can manage all administrators" ON administrators;

CREATE POLICY "Admins can manage all administrators" 
ON administrators
FOR ALL 
TO public
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));