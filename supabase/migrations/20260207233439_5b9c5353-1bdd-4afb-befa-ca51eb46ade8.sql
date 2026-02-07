-- Remove unused delivery platform columns from sessions table
ALTER TABLE public.sessions DROP COLUMN IF EXISTS gustoco_revenue;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS orderhut_revenue;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS ubereats_revenue;