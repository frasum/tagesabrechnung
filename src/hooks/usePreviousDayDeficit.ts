import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the previous business day's STANDALONE operative cash result, capped at 0
 * (only deficits). This is intentionally NOT the cumulative carry-over and is
 * decoupled from useCashBalanceData / register transfers / bank deposits.
 *
 * Daily settlement (Tagesabrechnung) treats each day's float as 2.000 € and
 * only inherits an operational deficit from the immediate previous day with data.
 * Surpluses belong to the bank deposit pipeline shown in the Bargeldbestand.
 *
 * Standalone raw daily cash for the previous day:
 *   pos_total + vouchers_sold + sonstige_einnahme
 *   - terminal_1_total - terminal_2_total
 *   - ordersmart_revenue - wolt_revenue
 *   - vouchers_redeemed - finedine_vouchers - einladung
 *   - open_invoices - advances - expenses
 *
 * Returns: deficit value (≤ 0), the source date used, and the raw value for transparency.
 */
export function usePreviousDayDeficit(date: Date, restaurantId: string | null) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['previous-day-deficit', restaurantId, dateStr],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) {
        return { deficit: 0, sourceDate: null as string | null, rawPreviousDay: 0 };
      }

      // 1) Find the immediate previous session for this restaurant
      const { data: prevSession, error: prevErr } = await supabase
        .from('sessions')
        .select('id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, vorschuss')
        .eq('restaurant_id', restaurantId)
        .lt('session_date', dateStr)
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevErr) throw prevErr;
      if (!prevSession) {
        return { deficit: 0, sourceDate: null as string | null, rawPreviousDay: 0 };
      }

      // 2) Load shifts/expenses/advances for that exact session
      const [shiftsRes, expensesRes, advancesRes] = await Promise.all([
        supabase.from('waiter_shifts').select('open_invoices').eq('session_id', prevSession.id),
        supabase.from('expenses').select('amount').eq('session_id', prevSession.id),
        supabase.from('advances').select('amount').eq('session_id', prevSession.id),
      ]);

      if (shiftsRes.error) throw shiftsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (advancesRes.error) throw advancesRes.error;

      const totalOpenInvoices = (shiftsRes.data || []).reduce((sum, s) => sum + Number(s.open_invoices || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalAdvances = (advancesRes.data || []).length > 0
        ? (advancesRes.data || []).reduce((sum, a) => sum + Number(a.amount || 0), 0)
        : Number(prevSession.vorschuss || 0);

      const rawPreviousDay =
        Number(prevSession.pos_total || 0) +
        Number(prevSession.vouchers_sold || 0) +
        Number(prevSession.sonstige_einnahme || 0) -
        Number(prevSession.terminal_1_total || 0) -
        Number(prevSession.terminal_2_total || 0) -
        Number(prevSession.ordersmart_revenue || 0) -
        Number(prevSession.wolt_revenue || 0) -
        Number(prevSession.vouchers_redeemed || 0) -
        Number(prevSession.finedine_vouchers || 0) -
        Number(prevSession.einladung || 0) -
        totalOpenInvoices -
        totalAdvances -
        totalExpenses;

      const deficit = rawPreviousDay < 0 ? rawPreviousDay : 0;

      return {
        deficit,
        sourceDate: prevSession.session_date as string,
        rawPreviousDay,
      };
    },
  });

  return {
    // Backwards compatible: `data` is the deficit value (≤ 0)
    data: query.data?.deficit ?? 0,
    sourceDate: query.data?.sourceDate ?? null,
    rawPreviousDay: query.data?.rawPreviousDay ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
