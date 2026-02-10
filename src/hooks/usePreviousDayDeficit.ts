import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

/**
 * Loads all sessions up to (and including) the previous day,
 * calculates BARGELD per day, and chains any negative carry-over.
 * Returns the deficit that should be subtracted on `date`.
 */
export function usePreviousDayDeficit(date: Date, restaurantId: string | null) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['previous-day-deficit', restaurantId, dateStr],
    queryFn: async (): Promise<number> => {
      if (!restaurantId) return 0;

      // Load all sessions before the selected date (last 30 days max for performance)
      const lookbackDate = format(subDays(date, 30), 'yyyy-MM-dd');

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('session_date', lookbackDate)
        .lt('session_date', dateStr)
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return 0;

      const sessionIds = sessions.map(s => s.id);

      // Load related data in parallel
      const [shiftsResult, expensesResult, advancesResult] = await Promise.all([
        supabase.from('waiter_shifts').select('*').in('session_id', sessionIds),
        supabase.from('expenses').select('*').in('session_id', sessionIds),
        supabase.from('advances').select('*').in('session_id', sessionIds),
      ]);

      if (shiftsResult.error) throw shiftsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (advancesResult.error) throw advancesResult.error;

      const allShifts = shiftsResult.data || [];
      const allExpenses = expensesResult.data || [];
      const allAdvances = advancesResult.data || [];

      // Calculate BARGELD per day and chain deficits
      let carryOver = 0;

      for (const session of sessions) {
        const shifts = allShifts.filter(s => s.session_id === session.id);
        const sessionExpenses = allExpenses.filter(e => e.session_id === session.id);
        const sessionAdvances = allAdvances.filter(a => a.session_id === session.id);

        const tagesumsatz = session.pos_total || 0;
        const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
        const ordersmart = session.ordersmart_revenue || 0;
        const wolt = session.wolt_revenue || 0;
        const takeaway = session.takeaway_total || 0;
        const gutscheineEL = session.vouchers_redeemed || 0;
        const finedine = session.finedine_vouchers || 0;
        const gutscheineVK = session.vouchers_sold || 0;
        const einladung = session.einladung || 0;
        const sonstigeEinnahme = session.sonstige_einnahme || 0; // kept for reference, already in pos_total
        const vorschuss = sessionAdvances.length > 0
          ? sessionAdvances.reduce((sum, a) => sum + a.amount, 0)
          : (session.vorschuss || 0);
        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Note: sonstige_einnahme is already included in pos_total (Vectron), so not added here
        const bargeld =
          tagesumsatz +
          gutscheineVK -
          kreditkarten -
          ordersmart -
          wolt -
          takeaway -
          gutscheineEL -
          finedine -
          einladung -
          totalOpenInvoices -
          vorschuss -
          totalExpenses +
          carryOver; // include previous day's deficit

        // Chain: if bargeld is negative, carry it over; otherwise reset
        carryOver = bargeld < 0 ? bargeld : 0;
      }

      return carryOver; // negative number or 0
    },
    enabled: !!restaurantId,
  });
}
