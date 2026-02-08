-- Drop the old constraint that only uses session_date
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_session_date_key;

-- Create a new unique constraint that combines session_date AND restaurant_id
-- This allows each restaurant to have one session per day
ALTER TABLE public.sessions ADD CONSTRAINT sessions_restaurant_date_unique UNIQUE (restaurant_id, session_date);