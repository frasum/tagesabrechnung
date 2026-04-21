CREATE OR REPLACE FUNCTION public.compute_carry_over(p_restaurant_id uuid, p_before_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_initial_deficit numeric;
  v_carry_over numeric;
  v_raw_bargeld numeric;
  v_transfer_effect numeric;
  v_bargeld numeric;
  rec RECORD;
BEGIN
  SELECT COALESCE(initial_cash_deficit, 0)
    INTO v_initial_deficit
    FROM restaurants
   WHERE id = p_restaurant_id;

  v_carry_over := v_initial_deficit;

  FOR rec IN (
    WITH session_dates AS (
      SELECT DISTINCT session_date AS d FROM sessions
       WHERE restaurant_id = p_restaurant_id
         AND session_date < p_before_date
    ),
    transfer_dates AS (
      SELECT DISTINCT transfer_date AS d FROM register_transfers
       WHERE restaurant_id = p_restaurant_id
         AND transfer_date < p_before_date
    ),
    all_dates AS (
      SELECT d FROM session_dates
      UNION
      SELECT d FROM transfer_dates
      ORDER BY d
    )
    SELECT
      ad.d AS the_date,
      s.id AS session_id,
      COALESCE(s.pos_total, 0) AS pos_total,
      COALESCE(s.terminal_1_total, 0) + COALESCE(s.terminal_2_total, 0) AS kreditkarten,
      COALESCE(s.ordersmart_revenue, 0) AS ordersmart,
      COALESCE(s.wolt_revenue, 0) AS wolt,
      COALESCE(s.vouchers_redeemed, 0) AS gutscheine_el,
      COALESCE(s.finedine_vouchers, 0) AS finedine,
      COALESCE(s.vouchers_sold, 0) AS gutscheine_vk,
      COALESCE(s.einladung, 0) AS einladung,
      COALESCE(s.sonstige_einnahme, 0) AS sonstige_einnahme,
      COALESCE(s.vorschuss, 0) AS session_vorschuss
    FROM all_dates ad
    LEFT JOIN sessions s ON s.session_date = ad.d AND s.restaurant_id = p_restaurant_id
    ORDER BY ad.d
  )
  LOOP
    IF rec.session_id IS NOT NULL THEN
      SELECT COALESCE(SUM(COALESCE(open_invoices, 0)), 0)
        INTO v_raw_bargeld
        FROM waiter_shifts
       WHERE session_id = rec.session_id;

      v_raw_bargeld := (
        SELECT rec.pos_total
             + rec.gutscheine_vk
             + rec.sonstige_einnahme
             - rec.kreditkarten
             - rec.ordersmart
             - rec.wolt
             - rec.gutscheine_el
             - rec.finedine
             - rec.einladung
             - v_raw_bargeld
             - COALESCE((
                 SELECT SUM(amount) FROM advances WHERE session_id = rec.session_id
               ), rec.session_vorschuss)
             - COALESCE((
                 SELECT SUM(amount) FROM expenses WHERE session_id = rec.session_id
               ), 0)
      );
    ELSE
      v_raw_bargeld := 0;
    END IF;

    SELECT COALESCE(SUM(
      CASE WHEN direction = 'to_restaurant' THEN amount ELSE -amount END
    ), 0)
      INTO v_transfer_effect
      FROM register_transfers
     WHERE restaurant_id = p_restaurant_id
       AND transfer_date = rec.the_date;

    v_bargeld := v_raw_bargeld + v_transfer_effect + v_carry_over;
    -- Cumulative Balance Chaining: carry over both positive and negative balances
    v_carry_over := v_bargeld;
  END LOOP;

  RETURN COALESCE(v_carry_over, v_initial_deficit);
END;
$function$;