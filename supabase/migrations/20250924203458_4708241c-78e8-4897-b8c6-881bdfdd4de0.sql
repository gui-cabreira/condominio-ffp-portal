-- Função para criar usuário admin específico
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Buscar usuário por email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;
  
  -- Se usuário existe, criar perfil e atribuir role de admin
  IF admin_user_id IS NOT NULL THEN
    -- Criar perfil
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
      admin_user_id,
      user_email,
      'Admin',
      'FFP'
    ) ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name;
    
    -- Atribuir role de admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin user created successfully for %', user_email;
  ELSE
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$;