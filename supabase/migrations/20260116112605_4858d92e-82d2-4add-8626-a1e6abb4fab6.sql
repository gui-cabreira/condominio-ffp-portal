-- Adicionar coluna owner_id para vincular instância ao supervisor
ALTER TABLE public.uazapi_instances 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Comentário explicativo
COMMENT ON COLUMN public.uazapi_instances.owner_id IS 'ID do supervisor dono desta instância. NULL = instância de admin/sistema';

-- Atualizar instâncias existentes: se criada por alguém, esse é o owner
UPDATE public.uazapi_instances 
SET owner_id = created_by 
WHERE owner_id IS NULL AND created_by IS NOT NULL;

-- Dropar políticas existentes
DROP POLICY IF EXISTS "Admins can manage instances" ON public.uazapi_instances;
DROP POLICY IF EXISTS "Authenticated users can view instances" ON public.uazapi_instances;

-- Policy: Admin pode fazer TUDO
CREATE POLICY "Admins full access to instances"
ON public.uazapi_instances
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy: Supervisor pode VER instâncias autônomas + suas próprias
CREATE POLICY "Supervisors can view autonomous and own instances"
ON public.uazapi_instances
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor') 
  AND (
    is_autonomous = true 
    OR owner_id = auth.uid()
    OR created_by = auth.uid()
  )
);

-- Policy: Supervisor pode CRIAR sua própria instância
CREATE POLICY "Supervisors can create own instances"
ON public.uazapi_instances
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'supervisor') 
  AND owner_id = auth.uid()
);

-- Policy: Supervisor pode ATUALIZAR apenas suas instâncias
CREATE POLICY "Supervisors can update own instances"
ON public.uazapi_instances
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor') 
  AND owner_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'supervisor') 
  AND owner_id = auth.uid()
);

-- Policy: Supervisor pode DELETAR apenas suas instâncias
CREATE POLICY "Supervisors can delete own instances"
ON public.uazapi_instances
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor') 
  AND owner_id = auth.uid()
);

-- Policy: Funcionários (employee) podem apenas ver instâncias autônomas
CREATE POLICY "Employees can view autonomous instances"
ON public.uazapi_instances
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employee') 
  AND is_autonomous = true
);