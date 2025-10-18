-- Fix database security issues

-- Fix 2: Restrict developer UPDATE permissions on profiles
DO $$
BEGIN
  -- Drop old policy if exists
  DROP POLICY IF EXISTS "Developers can update all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Developers can update their own profile" ON public.profiles;
  
  -- Create new policy
  CREATE POLICY "Developers can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'developer') AND auth.uid() = id);
END $$;

-- Fix 3: Create view for restricted units access
CREATE OR REPLACE VIEW public.units_limited AS
SELECT 
  id,
  condominium_id,
  unit_number,
  created_at,
  updated_at,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_name 
  END as owner_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_email 
  END as owner_email,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_phone 
  END as owner_phone,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_cpf 
  END as owner_cpf,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_street 
  END as owner_street,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_number 
  END as owner_number,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_complement 
  END as owner_complement,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_neighborhood 
  END as owner_neighborhood,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_city 
  END as owner_city,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_state 
  END as owner_state,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_zip_code 
  END as owner_zip_code
FROM public.units;

-- Fix 4: Drop views exposing auth.users
DO $$
DECLARE
  view_rec RECORD;
BEGIN
  FOR view_rec IN 
    SELECT schemaname, viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND (definition LIKE '%auth.users%' OR definition LIKE '%auth_users%')
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.schemaname, view_rec.viewname);
  END LOOP;
END $$;

-- Fix 5: Recreate statistics views with security_invoker
DROP VIEW IF EXISTS public.login_statistics CASCADE;
DROP VIEW IF EXISTS public.defaulter_statistics CASCADE;
DROP VIEW IF EXISTS public.message_statistics CASCADE;

CREATE VIEW public.login_statistics
WITH (security_invoker = true)
AS
SELECT 
  p.id as user_id,
  p.email,
  COUNT(ll.id) as total_logins,
  MAX(ll.login_at) as last_login,
  COUNT(CASE WHEN ll.success = false THEN 1 END) as failed_attempts
FROM public.profiles p
LEFT JOIN public.login_logs ll ON ll.user_id = p.id
GROUP BY p.id, p.email;

CREATE VIEW public.defaulter_statistics
WITH (security_invoker = true)
AS
SELECT 
  c.id as condominium_id,
  c.name as condominium_name,
  COUNT(DISTINCT u.id) as total_units,
  COUNT(DISTINCT CASE WHEN ch.status = 'pending' THEN u.id END) as defaulter_units,
  COUNT(DISTINCT CASE WHEN ch.status = 'paid' THEN u.id END) as paid_units,
  COALESCE(SUM(CASE WHEN ch.status = 'pending' THEN ch.amount ELSE 0 END), 0) as total_pending_amount,
  COALESCE(SUM(CASE WHEN ch.status = 'paid' THEN ch.amount ELSE 0 END), 0) as total_paid_amount
FROM public.condominiums c
LEFT JOIN public.units u ON u.condominium_id = c.id
LEFT JOIN public.charges ch ON ch.unit_id = u.id
GROUP BY c.id, c.name;

CREATE VIEW public.message_statistics
WITH (security_invoker = true)
AS
SELECT 
  c.id as condominium_id,
  c.name as condominium_name,
  COUNT(m.id) as total_messages_sent,
  COUNT(CASE WHEN m.opened_at IS NOT NULL THEN 1 END) as messages_opened,
  COUNT(CASE WHEN m.responded_at IS NOT NULL THEN 1 END) as messages_responded,
  COUNT(CASE WHEN m.opened_at IS NULL THEN 1 END) as messages_not_opened
FROM public.condominiums c
LEFT JOIN public.units u ON u.condominium_id = c.id
LEFT JOIN public.messages m ON m.unit_id = u.id
GROUP BY c.id, c.name;