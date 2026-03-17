
-- Drop and recreate mv_daily_summary with ALL needed fields
DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_summary;

CREATE MATERIALIZED VIEW public.mv_daily_summary AS
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
  COALESCE(s.vouchers_redeemed, 0) AS vouchers_redeemed,
  COALESCE(s.finedine_vouchers, 0) AS finedine_vouchers,
  COALESCE(s.einladung, 0) AS einladung,
  COALESCE(s.sonstige_einnahme, 0) AS sonstige_einnahme,
  s.notes,
  s.created_by_name,
  s.id AS session_id,
  COUNT(DISTINCT ws.id) AS waiter_count,
  COALESCE(SUM(ws.pos_sales), 0) AS total_waiter_sales,
  COALESCE(SUM(ws.hours_worked), 0) AS total_waiter_hours,
  COALESCE(SUM(ws.kitchen_tip), 0) AS total_kitchen_tip,
  COALESCE(SUM(ws.differenz), 0) AS total_differenz,
  COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.session_id = s.id), 0) AS total_expenses,
  COALESCE((SELECT SUM(adv.amount) FROM advances adv WHERE adv.session_id = s.id), 0) AS total_advances,
  COUNT(DISTINCT ks.id) AS kitchen_staff_count,
  COALESCE((SELECT SUM(ks2.hours_worked) FROM kitchen_shifts ks2 WHERE ks2.session_id = s.id), 0) AS total_kitchen_hours
FROM public.sessions s
LEFT JOIN public.waiter_shifts ws ON ws.session_id = s.id
LEFT JOIN public.kitchen_shifts ks ON ks.session_id = s.id
GROUP BY s.id;

CREATE UNIQUE INDEX idx_mv_daily_summary_pk ON public.mv_daily_summary (restaurant_id, session_date);
CREATE INDEX idx_mv_daily_summary_date ON public.mv_daily_summary (session_date);

-- Revoke public API access
REVOKE ALL ON public.mv_daily_summary FROM anon, authenticated;
