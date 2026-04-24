import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the rolling OPERATIVE deficit carried into `date` from previous days.
 *
 * Semantics (Tagesabrechnung view, intentionally decoupled from bank deposits
 * and register transfers — those live on the Bargeldbestand page):
 *
 *   operativeBalance = 0
 *   for each session day d < date (chronological):
 *     operativeBalance += rawBargeld(d)              // pure daily cash effect
 *     skim              = max(0, operativeBalance)   // surplus → tresor
 *     operativeBalance -= skim                       // only deficit remains
 *   return operativeBalance   // ≤ 0
 *
 * I.e. a deficit is carried forward across multiple days until a future day
 * operatively compensates it. Surpluses are immediately consumed by skim
 * and do NOT inflate today's petty cash.
 *
 * Look-back window: 90 days (safety cap; in practice deficits rarely chain
 * that long because surplus days collapse the running balance to 0).
 */
export function usePreviousDayDeficit(date: Date, restaurantId: string | null) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const lookbackFromStr = format(subDays(date, 90), 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['previous-operative-deficit', restaurantId, dateStr],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) {
        return { deficit: 0, sourceDate: null as string | null, rawPreviousDay: 0 };
      }

      // 1) Load all sessions in the look-back window (chronological)
      const { data: sessions, error: sErr } = await supabase
        .from('sessions')
        .select('id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, vouchers_sold, vouchers_redeemed, finedine_vouchers, einladung, sonstige_einnahme, vorschuss')
        .eq('restaurant_id', restaurantId)
        .gte('session_date', lookbackFromStr)
        .lt('session_date', dateStr)
        .order('session_date', { ascending: true });

      if (sErr) throw sErr;
      if (!sessions || sessions.length === 0) {
        return { deficit: 0, sourceDate: null as string | null, rawPreviousDay: 0 };
      }

      const sessionIds = sessions.map(s => s.id);

      // 2) Load shifts/expenses/advances for all those sessions in batches of 500
      const chunkSize = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        chunks.push(sessionIds.slice(i, i + chunkSize));
      }

      const [shifts, expenses, advances] = await Promise.all([
        Promise.all(chunks.map(c =>
          supabase.from('waiter_shifts').select('session_id, open_invoices').in('session_id', c)
        )).then(rs => rs.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(c =>
          supabase.from('expenses').select('session_id, amount').in('session_id', c)
        )).then(rs => rs.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(c =>
          supabase.from('advances').select('session_id, amount').in('session_id', c)
        )).then(rs => rs.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
      ]);

      // 3) Walk chronologically, accumulating operative balance with skim-on-surplus
      let operativeBalance = 0;
      let lastRaw = 0;
      let lastDate: string | null = null;

      for (const s of sessions) {
        const totalOpenInvoices = shifts
          .filter(w => w.session_id === s.id)
          .reduce((sum, w) => sum + Number(w.open_invoices || 0), 0);
        const totalExpenses = expenses
          .filter(e => e.session_id === s.id)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const sessionAdvances = advances.filter(a => a.session_id === s.id);
        const totalAdvances = sessionAdvances.length > 0
          ? sessionAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
          : Number(s.vorschuss || 0);

        const rawBargeld =
          Number(s.pos_total || 0) +
          Number(s.vouchers_sold || 0) +
          Number(s.sonstige_einnahme || 0) -
          Number(s.terminal_1_total || 0) -
          Number(s.terminal_2_total || 0) -
          Number(s.ordersmart_revenue || 0) -
          Number(s.wolt_revenue || 0) -
          Number(s.vouchers_redeemed || 0) -
          Number(s.finedine_vouchers || 0) -
          Number(s.einladung || 0) -
          totalOpenInvoices -
          totalAdvances -
          totalExpenses;

        operativeBalance += rawBargeld;
        const skim = Math.max(0, operativeBalance);
        operativeBalance -= skim;   // keep only the deficit portion

        lastRaw = rawBargeld;
        lastDate = s.session_date;
      }

      // operativeBalance is ≤ 0 by construction
      return {
        deficit: operativeBalance,
        sourceDate: lastDate,
        rawPreviousDay: lastRaw,
      };
    },
  });

  return {
    // Backwards compatible: `data` is the rolling deficit value (≤ 0)
    data: query.data?.deficit ?? 0,
    sourceDate: query.data?.sourceDate ?? null,
    rawPreviousDay: query.data?.rawPreviousDay ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
