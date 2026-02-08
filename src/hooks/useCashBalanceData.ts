import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CashBalanceRow {
  date: string;
  kellnerUmsatz: number;
  kreditkarten: number;
  ordersmart: number;
  wolt: number;
  gutscheineEL: number;
  finedine: number;
  gutscheineVK: number;
  einladung: number;
  offeneRE: number;
  vorschuss: number;
  ausgaben: number;
  bargeld: number;
}

export function useCashBalanceData() {
  return useQuery({
    queryKey: ['cash-balance'],
    queryFn: async (): Promise<CashBalanceRow[]> => {
      // 1. Alle Sessions laden
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      // 2. Alle waiter_shifts laden
      const { data: waiterShifts, error: shiftsError } = await supabase
        .from('waiter_shifts')
        .select('*');

      if (shiftsError) throw shiftsError;

      // 3. Alle expenses laden
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // 4. Pro Session aggregieren und BARGELD berechnen
      return (sessions || []).map((session) => {
        const shifts = (waiterShifts || []).filter((s) => s.session_id === session.id);
        const sessionExpenses = (expenses || []).filter((e) => e.session_id === session.id);

        // Berechnungen
        const kellnerUmsatz = shifts.reduce((sum, w) => sum + (w.pos_sales || 0), 0);
        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
        const ordersmart = session.ordersmart_revenue || 0;
        const wolt = session.wolt_revenue || 0;
        const gutscheineEL = session.vouchers_redeemed || 0;
        const finedine = session.finedine_vouchers || 0;
        const gutscheineVK = session.vouchers_sold || 0;
        const einladung = session.einladung || 0;
        const vorschuss = session.vorschuss || 0;

        // BARGELD = Einnahmen - Abzüge
        // Einnahmen: Kellner-Umsatz + Gutschein-Verkauf
        // Abzüge: Kreditkarten, OrderSmart, Wolt, Gutscheine EL, FineDine, Einladung, Offene RE, Vorschuss, Ausgaben
        const bargeld =
          kellnerUmsatz +
          gutscheineVK -
          kreditkarten -
          ordersmart -
          wolt -
          gutscheineEL -
          finedine -
          einladung -
          totalOpenInvoices -
          vorschuss -
          totalExpenses;

        return {
          date: session.session_date,
          kellnerUmsatz,
          kreditkarten,
          ordersmart,
          wolt,
          gutscheineEL,
          finedine,
          gutscheineVK,
          einladung,
          offeneRE: totalOpenInvoices,
          vorschuss,
          ausgaben: totalExpenses,
          bargeld,
        };
      });
    },
  });
}
