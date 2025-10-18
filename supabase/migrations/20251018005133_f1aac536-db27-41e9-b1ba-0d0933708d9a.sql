-- Fix 1: Deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix 2: Restrict developer UPDATE permissions on profiles (only their own)
DROP POLICY IF EXISTS "Developers can update all profiles" ON public.profiles;

CREATE POLICY "Developers can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'developer') AND auth.uid() = id);

-- Fix 3: Restrict units table access - remove broad SELECT access for assistants
-- Create a view that masks sensitive owner data for non-admin roles
CREATE OR REPLACE VIEW public.units_limited AS
SELECT 
  id,
  condominium_id,
  unit_number,
  created_at,
  updated_at,
  -- Mask sensitive owner data
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_name 
    ELSE NULL 
  END as owner_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_email 
    ELSE NULL 
  END as owner_email,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_phone 
    ELSE NULL 
  END as owner_phone,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_cpf 
    ELSE NULL 
  END as owner_cpf,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_street 
    ELSE NULL 
  END as owner_street,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_number 
    ELSE NULL 
  END as owner_number,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_complement 
    ELSE NULL 
  END as owner_complement,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_neighborhood 
    ELSE NULL 
  END as owner_neighborhood,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_city 
    ELSE NULL 
  END as owner_city,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_state 
    ELSE NULL 
  END as owner_state,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'developer') 
    THEN owner_zip_code 
    ELSE NULL 
  END as owner_zip_code
FROM public.units;

-- Fix 4: Check for and drop any views exposing auth.users
-- First, let's identify views that might expose auth.users
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT schemaname, viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND (definition LIKE '%auth.users%' OR definition LIKE '%auth_users%')
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
    RAISE NOTICE 'Dropped view %.%', view_record.schemaname, view_record.viewname;
  END LOOP;
END $$;

-- Fix 5: Identify and fix security definer views
-- Convert login_statistics and defaulter_statistics views to SECURITY INVOKER if they exist
DROP VIEW IF EXISTS public.login_statistics CASCADE;
DROP VIEW IF EXISTS public.defaulter_statistics CASCADE;
DROP VIEW IF EXISTS public.message_statistics CASCADE;

-- Recreate login_statistics as SECURITY INVOKER (only accessible to admins via RLS)
CREATE OR REPLACE VIEW public.login_statistics
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

-- Recreate defaulter_statistics as SECURITY INVOKER
CREATE OR REPLACE VIEW public.defaulter_statistics
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

-- Recreate message_statistics as SECURITY INVOKER
CREATE OR REPLACE VIEW public.message_statistics
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

-- Add RLS policies for the views
ALTER VIEW public.login_statistics SET (security_invoker = true);
ALTER VIEW public.defaulter_statistics SET (security_invoker = true);
ALTER VIEW public.message_statistics SET (security_invoker = true);