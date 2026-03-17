
-- Performance indexes for high-frequency queries

-- zt_shifts: .in("week_id", [...]) is the most common query pattern
CREATE INDEX IF NOT EXISTS idx_zt_shifts_week ON public.zt_shifts (week_id);

-- zt_shifts: AI-Chat filters by shift_date range
CREATE INDEX IF NOT EXISTS idx_zt_shifts_date ON public.zt_shifts (shift_date);

-- sessions: cross-restaurant date queries (AI-Chat, statistics)
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions (session_date);

-- kitchen_shifts: staff_id lookups (sync, zeiterfassung)
CREATE INDEX IF NOT EXISTS idx_kitchen_shifts_staff ON public.kitchen_shifts (staff_id);

-- waiter_shifts: staff_id lookups
CREATE INDEX IF NOT EXISTS idx_waiter_shifts_staff ON public.waiter_shifts (staff_id);

-- Cleanup function for log tables
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- login_confirmations older than 7 days
  DELETE FROM public.login_confirmations
  WHERE created_at < now() - interval '7 days';

  -- auth_attempts older than 90 days
  DELETE FROM public.auth_attempts
  WHERE attempted_at < now() - interval '90 days';
END;
$$;

-- Materialized view for daily summaries (AI-Chat optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_summary AS
SELECT 
  s.restaurant_id,
  s.session_date,
  COALESCE(s.pos_total, 0) AS pos_total,
  COALESCE(s.guest_count, 0) AS guest_count,
  COALESCE(s.terminal_1_total, 0) + COALESCE(s.terminal_2_total, 0) AS card_total,
  COALESCE(s.ordersmart_revenue, 0) AS ordersmart_revenue,
  COALESCE(s.wolt_revenue, 0) AS wolt_revenue,
  COALESCE(s.takeaway_total, 0) AS takeaway_total,
  COALESCE(s.vouchers_sold, 0) AS vouchers_sold,
  COALESCE(s.einladung, 0) AS einladung,
  COALESCE(s.sonstige_einnahme, 0) AS sonstige_einnahme,
  s.notes,
  s.created_by_name,
  COUNT(DISTINCT ws.id) AS waiter_count,
  COALESCE(SUM(ws.pos_sales), 0) AS total_waiter_sales,
  COALESCE(SUM(ws.hours_worked), 0) AS total_waiter_hours,
  COALESCE(SUM(ws.kitchen_tip), 0) AS total_kitchen_tip,
  COALESCE(SUM(ws.differenz), 0) AS total_differenz,
  COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.session_id = s.id), 0) AS total_expenses,
  COUNT(DISTINCT ks.id) AS kitchen_staff_count,
  COALESCE((SELECT SUM(ks2.hours_worked) FROM kitchen_shifts ks2 WHERE ks2.session_id = s.id), 0) AS total_kitchen_hours
FROM public.sessions s
LEFT JOIN public.waiter_shifts ws ON ws.session_id = s.id
LEFT JOIN public.kitchen_shifts ks ON ks.session_id = s.id
GROUP BY s.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_summary_pk ON public.mv_daily_summary (restaurant_id, session_date);
