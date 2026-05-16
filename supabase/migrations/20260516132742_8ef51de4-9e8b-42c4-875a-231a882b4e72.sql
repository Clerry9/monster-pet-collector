
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
