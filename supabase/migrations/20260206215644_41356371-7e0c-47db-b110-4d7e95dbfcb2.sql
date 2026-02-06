ALTER TABLE public.sessions
ADD COLUMN takeaway_total NUMERIC DEFAULT 0,
ADD COLUMN spicery_transactions NUMERIC DEFAULT 0,
ADD COLUMN card_total_gl NUMERIC DEFAULT 0;