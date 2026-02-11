
-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can check confirmation by token" ON public.login_confirmations;

-- Replace with a restrictive policy that blocks direct client reads
CREATE POLICY "No public read login confirmations"
  ON public.login_confirmations
  FOR SELECT
  USING (false);
