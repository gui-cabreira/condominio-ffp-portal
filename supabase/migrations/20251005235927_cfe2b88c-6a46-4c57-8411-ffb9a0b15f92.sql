-- Criar função para auto-atribuição de role no signup
-- Esta função permite que novos usuários recebam um role automaticamente
CREATE OR REPLACE FUNCTION public.auto_assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é o primeiro usuário (primeiro admin)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    -- Primeiro usuário vira admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Usuários subsequentes viram employees por padrão
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após criação de usuário
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_user_role();

-- Também atualizar o trigger de perfil para usar os metadados corretos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;