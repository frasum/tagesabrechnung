
ALTER TABLE public.sessions
ADD COLUMN created_by_name text,
ADD COLUMN updated_by_name text;
