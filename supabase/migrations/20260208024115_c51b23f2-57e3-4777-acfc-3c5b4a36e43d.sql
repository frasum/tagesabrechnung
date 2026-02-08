-- Remove the staff_public view as it's no longer needed (pin_code column was removed from staff)
DROP VIEW IF EXISTS public.staff_public;