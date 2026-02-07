-- Add second_waiter_name column for team shifts (two waiters sharing one cash register key)
ALTER TABLE public.waiter_shifts 
ADD COLUMN second_waiter_name text DEFAULT NULL;