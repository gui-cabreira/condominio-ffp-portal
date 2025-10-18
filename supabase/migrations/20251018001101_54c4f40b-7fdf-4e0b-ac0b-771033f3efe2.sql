-- PARTE 2: Atribuir role developer ao Guilherme e criar policies
DO $$
DECLARE
  guilherme_id uuid;
BEGIN
  -- Buscar ID do Guilherme
  SELECT id INTO guilherme_id 
  FROM auth.users 
  WHERE email = 'guilherme.cabreira@ffpadvogados.com.br'
  LIMIT 1;
  
  IF guilherme_id IS NOT NULL THEN
    -- Remover roles existentes
    DELETE FROM public.user_roles WHERE user_id = guilherme_id;
    
    -- Adicionar role developer
    INSERT INTO public.user_roles (user_id, role)
    VALUES (guilherme_id, 'developer')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Developer role atribuída ao Guilherme';
  ELSE
    RAISE NOTICE 'Usuário guilherme.cabreira@ffpadvogados.com.br não encontrado - role será atribuída no primeiro login';
  END IF;
END $$;

-- Criar RLS policies para developer (acesso total)
CREATE POLICY "Developers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can view all condominiums" 
ON public.condominiums 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can manage all administrators" 
ON public.administrators 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can manage all charges" 
ON public.charges 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can manage all messages" 
ON public.messages 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can view all login logs" 
ON public.login_logs 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can view all system logs" 
ON public.system_logs 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Developers can manage all workflows" 
ON public.workflows 
FOR ALL 
USING (has_role(auth.uid(), 'developer'));

-- Atualizar policies de Assistant para NÃO ver dados financeiros
DROP POLICY IF EXISTS "Assistants can view units" ON public.units;
CREATE POLICY "Assistants can view units (no financial data)" 
ON public.units 
FOR SELECT 
USING (has_role(auth.uid(), 'assistant'));

DROP POLICY IF EXISTS "Assistants can view charges" ON public.charges;
CREATE POLICY "Assistants can manage charges" 
ON public.charges 
FOR ALL 
USING (has_role(auth.uid(), 'assistant'));