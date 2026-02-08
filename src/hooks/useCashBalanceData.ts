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

      // 2. Alle waiter_shifts laden (für offene Rechnungen)
      const { data: waiterShifts, error: shiftsError } = await supabase
        .from('waiter_shifts')
        .select('*');

      if (shiftsError) throw shiftsError;

      // 3. Alle expenses laden
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // 4. Pro Session direkt die DB-Werte verwenden
      return (sessions || []).map((session) => {
        const shifts = (waiterShifts || []).filter((s) => s.session_id === session.id);
        const sessionExpenses = (expenses || []).filter((e) => e.session_id === session.id);

        // Direkt aus der Session-Tabelle
        const tagesumsatz = session.pos_total || 0;
        const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
        const ordersmart = session.ordersmart_revenue || 0;
        const wolt = session.wolt_revenue || 0;
        const gutscheineEL = session.vouchers_redeemed || 0;
        const finedine = session.finedine_vouchers || 0;
        const gutscheineVK = session.vouchers_sold || 0;
        const einladung = session.einladung || 0;
        const vorschuss = session.vorschuss || 0;

        // Aggregierte Werte
        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        // BARGELD = Einnahmen - Abzüge
        // Einnahmen: Tagesumsatz (POS) + Gutschein-Verkauf
        // Abzüge: Kreditkarten, OrderSmart, Wolt, Gutscheine EL, FineDine, Einladung, Offene RE, Vorschuss, Ausgaben
        const bargeld =
          tagesumsatz +
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
          kellnerUmsatz: tagesumsatz,
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
