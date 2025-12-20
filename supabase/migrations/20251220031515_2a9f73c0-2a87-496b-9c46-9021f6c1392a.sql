-- Security-definer helpers to avoid recursive RLS when policies reference user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY (_roles)
  );
$$;

-- user_roles (this table is the source of recursion)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- administrator_contacts
DROP POLICY IF EXISTS "Admins and assistants can manage contacts" ON public.administrator_contacts;
CREATE POLICY "Admins and assistants can manage contacts"
ON public.administrator_contacts
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- administrator_sync_config
DROP POLICY IF EXISTS "Admins can manage sync config" ON public.administrator_sync_config;
CREATE POLICY "Admins can manage sync config"
ON public.administrator_sync_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- administrator_sync_logs
DROP POLICY IF EXISTS "System can manage sync logs" ON public.administrator_sync_logs;
CREATE POLICY "System can manage sync logs"
ON public.administrator_sync_logs
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- administrators
DROP POLICY IF EXISTS "Admins and assistants can manage administrators" ON public.administrators;
CREATE POLICY "Admins and assistants can manage administrators"
ON public.administrators
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- automation_executions
DROP POLICY IF EXISTS "Admins can manage automation executions" ON public.automation_executions;
CREATE POLICY "Admins can manage automation executions"
ON public.automation_executions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- automation_workflows
DROP POLICY IF EXISTS "Admins can manage automation workflows" ON public.automation_workflows;
CREATE POLICY "Admins can manage automation workflows"
ON public.automation_workflows
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- charge_imports
DROP POLICY IF EXISTS "Admins and assistants can manage imports" ON public.charge_imports;
CREATE POLICY "Admins and assistants can manage imports"
ON public.charge_imports
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- charge_timeline
DROP POLICY IF EXISTS "Admins and assistants can manage timeline" ON public.charge_timeline;
CREATE POLICY "Admins and assistants can manage timeline"
ON public.charge_timeline
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- charges
DROP POLICY IF EXISTS "Admins and assistants can manage charges" ON public.charges;
CREATE POLICY "Admins and assistants can manage charges"
ON public.charges
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- condominiums
DROP POLICY IF EXISTS "Admins and assistants can manage condominiums" ON public.condominiums;
CREATE POLICY "Admins and assistants can manage condominiums"
ON public.condominiums
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- login_logs
DROP POLICY IF EXISTS "Admins can view login logs" ON public.login_logs;
CREATE POLICY "Admins can view login logs"
ON public.login_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- login_statistics
DROP POLICY IF EXISTS "Admins can view login statistics" ON public.login_statistics;
CREATE POLICY "Admins can view login statistics"
ON public.login_statistics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- management_systems
DROP POLICY IF EXISTS "Admins can manage management systems" ON public.management_systems;
CREATE POLICY "Admins can manage management systems"
ON public.management_systems
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- negotiation_parameters
DROP POLICY IF EXISTS "Admins can manage parameters" ON public.negotiation_parameters;
CREATE POLICY "Admins can manage parameters"
ON public.negotiation_parameters
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- messages
DROP POLICY IF EXISTS "Admins and assistants can manage messages" ON public.messages;
CREATE POLICY "Admins and assistants can manage messages"
ON public.messages
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'assistant'::public.user_role]));

-- user_invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflow_edges
DROP POLICY IF EXISTS "Admins can manage workflow edges" ON public.workflow_edges;
CREATE POLICY "Admins can manage workflow edges"
ON public.workflow_edges
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflow_executions
DROP POLICY IF EXISTS "Admins can manage workflow executions" ON public.workflow_executions;
CREATE POLICY "Admins can manage workflow executions"
ON public.workflow_executions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflow_loop_configs
DROP POLICY IF EXISTS "Admins can manage loop configs" ON public.workflow_loop_configs;
CREATE POLICY "Admins can manage loop configs"
ON public.workflow_loop_configs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflow_loops
DROP POLICY IF EXISTS "Admins can manage workflow loops" ON public.workflow_loops;
CREATE POLICY "Admins can manage workflow loops"
ON public.workflow_loops
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflow_nodes
DROP POLICY IF EXISTS "Admins can manage workflow nodes" ON public.workflow_nodes;
CREATE POLICY "Admins can manage workflow nodes"
ON public.workflow_nodes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- workflows
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflows;
CREATE POLICY "Admins can manage workflows"
ON public.workflows
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));
