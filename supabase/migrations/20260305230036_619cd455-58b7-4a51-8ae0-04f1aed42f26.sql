CREATE TABLE public.zt_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  staff_name text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'waiter',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zt_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow zt_sync_logs insert via app"
  ON public.zt_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow zt_sync_logs read via app"
  ON public.zt_sync_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow zt_sync_logs delete via app"
  ON public.zt_sync_logs FOR DELETE
  USING (true);

CREATE INDEX idx_zt_sync_logs_restaurant_date ON public.zt_sync_logs (restaurant_id, session_date DESC);