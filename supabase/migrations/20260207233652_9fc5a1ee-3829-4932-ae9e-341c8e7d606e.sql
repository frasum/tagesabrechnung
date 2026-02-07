-- Remove unused opentabs_deduction column from sessions table
ALTER TABLE public.sessions DROP COLUMN IF EXISTS opentabs_deduction;