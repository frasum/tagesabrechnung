-- Fix: Make view use SECURITY INVOKER (the default, but explicit is clearer)
DROP VIEW IF EXISTS public.staff_public;

CREATE VIEW public.staff_public 
WITH (security_invoker = true)
AS
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

-- Re-grant access
GRANT SELECT ON public.staff_public TO anon, authenticated;