-- Revert column-level SELECT restriction on public.staff which broke every
-- select('*') query in the app (staff list empty -> Arbeitszeiten unsichtbar).
REVOKE SELECT ON public.staff FROM anon, authenticated;
GRANT SELECT ON public.staff TO anon, authenticated;
GRANT ALL ON public.staff TO service_role;