
ALTER TABLE public.scheduling_periods
  ADD COLUMN share_token TEXT UNIQUE,
  ADD COLUMN shared_at TIMESTAMPTZ;
