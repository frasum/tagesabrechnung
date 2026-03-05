ALTER TABLE public.bavarian_holidays 
  ADD COLUMN surcharge_rate numeric NOT NULL DEFAULT 1.25,
  ADD COLUMN from_hour integer;