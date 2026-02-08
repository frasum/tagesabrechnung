-- Create a secure view that excludes pin_code for client access
CREATE OR REPLACE VIEW public.staff_public AS
SELECT 
  id,
  name,
  role,
  hourly_rate,
  notes,
  is_active,
  created_at,
  updated_at
FROM public.staff;

-- Grant access to the view
GRANT SELECT ON public.staff_public TO anon, authenticated;

-- Now restrict access to the actual staff table
-- Drop the existing permissive policies
DROP POLICY IF EXISTS "Allow staff read via app" ON public.staff;
DROP POLICY IF EXISTS "Allow staff update via app" ON public.staff;

-- Create restrictive policies - staff table should NOT be directly readable by clients
-- Only service role (edge functions) can read staff with pin_codes
CREATE POLICY "Deny direct staff read"
  ON public.staff FOR SELECT
  USING (false);

-- Staff updates should still work for the app (but not expose pins)
-- We need to use the view or edge functions for reads
CREATE POLICY "Allow staff updates via app"
  ON public.staff FOR UPDATE
  USING (true);

CREATE POLICY "Allow staff inserts via app"
  ON public.staff FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow staff deletes via app"
  ON public.staff FOR DELETE
  USING (true);