-- Restaurar a role de admin do usuário atual
INSERT INTO public.user_roles (user_id, role)
VALUES ('550bacdd-e2c6-4e34-a29f-5eb33654b0d5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar função para prevenir que o último admin perca sua role
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Se está deletando ou atualizando de admin para outra role
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin')) THEN
    -- Contar quantos admins restam
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin' AND user_id != OLD.user_id;
    
    -- Se for o último admin, bloquear
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador do sistema';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para prevenir remoção do último admin
DROP TRIGGER IF EXISTS prevent_last_admin_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_admin_trigger
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
WHEN (OLD.role = 'admin')
EXECUTE FUNCTION prevent_last_admin_removal();

-- Adicionar política RLS para permitir UPDATE em user_roles por admins
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));