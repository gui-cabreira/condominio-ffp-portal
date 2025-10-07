-- Drop existing restrictive policies that conflict
DROP POLICY IF EXISTS "Admins can manage bugs" ON public.system_bugs;
DROP POLICY IF EXISTS "Users can view their own bugs" ON public.system_bugs;
DROP POLICY IF EXISTS "Users can report bugs" ON public.system_bugs;

-- Create permissive policies (using OR logic)
CREATE POLICY "Admins can manage all bugs"
ON public.system_bugs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can view their own bugs"
ON public.system_bugs
FOR SELECT
TO authenticated
USING (reported_by = auth.uid());

CREATE POLICY "Users can report bugs"
ON public.system_bugs
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() IS NOT NULL) AND (reported_by = auth.uid()));