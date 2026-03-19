-- FIX 1: staff_pins - Block ALL public access (service role only)
ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public read staff_pins"
  ON public.staff_pins FOR SELECT TO public
  USING (false);

CREATE POLICY "No public insert staff_pins"
  ON public.staff_pins FOR INSERT TO public
  WITH CHECK (false);

CREATE POLICY "No public update staff_pins"
  ON public.staff_pins FOR UPDATE TO public
  USING (false);

CREATE POLICY "No public delete staff_pins"
  ON public.staff_pins FOR DELETE TO public
  USING (false);

-- FIX 2: user_roles - Block public INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow user_roles insert via service" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user_roles update via service" ON public.user_roles;
DROP POLICY IF EXISTS "Allow user_roles delete via service" ON public.user_roles;

CREATE POLICY "No public insert user_roles"
  ON public.user_roles FOR INSERT TO public
  WITH CHECK (false);

CREATE POLICY "No public update user_roles"
  ON public.user_roles FOR UPDATE TO public
  USING (false);

CREATE POLICY "No public delete user_roles"
  ON public.user_roles FOR DELETE TO public
  USING (false);

-- FIX 3: login_confirmations - Block public INSERT/UPDATE
DROP POLICY IF EXISTS "Service can create login confirmations" ON public.login_confirmations;
DROP POLICY IF EXISTS "Service can update login confirmations" ON public.login_confirmations;

CREATE POLICY "No public insert login_confirmations"
  ON public.login_confirmations FOR INSERT TO public
  WITH CHECK (false);

CREATE POLICY "No public update login_confirmations"
  ON public.login_confirmations FOR UPDATE TO public
  USING (false);