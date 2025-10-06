-- Políticas RLS para assistentes

-- Assistentes podem visualizar administradoras
DROP POLICY IF EXISTS "Assistants can view administrators" ON public.administrators;
CREATE POLICY "Assistants can view administrators"
ON public.administrators
FOR SELECT
USING (has_role(auth.uid(), 'assistant'));

-- Assistentes podem gerenciar importações de cobranças
DROP POLICY IF EXISTS "Assistants can manage imports" ON public.charge_imports;
CREATE POLICY "Assistants can manage imports"
ON public.charge_imports
FOR ALL
USING (has_role(auth.uid(), 'assistant'));

-- Assistentes podem visualizar condomínios
DROP POLICY IF EXISTS "Assistants can view condominiums" ON public.condominiums;
CREATE POLICY "Assistants can view condominiums"
ON public.condominiums
FOR SELECT
USING (has_role(auth.uid(), 'assistant'));

-- Assistentes podem visualizar unidades
DROP POLICY IF EXISTS "Assistants can view units" ON public.units;
CREATE POLICY "Assistants can view units"
ON public.units
FOR SELECT
USING (has_role(auth.uid(), 'assistant'));

-- Assistentes podem gerenciar mensagens
DROP POLICY IF EXISTS "Assistants can manage messages" ON public.messages;
CREATE POLICY "Assistants can manage messages"
ON public.messages
FOR ALL
USING (has_role(auth.uid(), 'assistant'));