ALTER TABLE public.sessions 
  ADD COLUMN is_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN unlocked_at timestamptz,
  ADD COLUMN unlocked_by_name text;