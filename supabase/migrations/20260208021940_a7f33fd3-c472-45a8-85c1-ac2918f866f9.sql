-- Remove unused phone column from staff table
ALTER TABLE public.staff DROP COLUMN IF EXISTS phone;