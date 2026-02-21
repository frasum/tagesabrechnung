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
  rawBargeld: number;
}

export function useCashBalanceData(restaurantId: string | null) {
  return useQuery({
    queryKey: ['cash-balance', restaurantId],
    queryFn: async (): Promise<CashBalanceRow[]> => {
      if (!restaurantId) return [];

      // 0+1. Restaurant + Sessions parallel laden
      const [restaurantResult, sessionsResult] = await Promise.all([
        supabase
          .from('restaurants')
          .select('initial_cash_deficit')
          .eq('id', restaurantId)
          .single(),
        supabase
          .from('sessions')
          .select('id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, takeaway_total, vouchers_redeemed, finedine_vouchers, vouchers_sold, einladung, vorschuss, sonstige_einnahme')
          .eq('restaurant_id', restaurantId)
          .order('session_date', { ascending: true })
          .limit(10000),
      ]);

      const initialDeficit = (restaurantResult.data as any)?.initial_cash_deficit ?? 0;
      const sessions = sessionsResult.data;
      if (sessionsResult.error) throw sessionsResult.error;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map(s => s.id);

      // Batch session IDs in chunks of 500 to avoid query limits
      const chunkSize = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        chunks.push(sessionIds.slice(i, i + chunkSize));
      }

      // 2-4. Load waiter_shifts, expenses, advances in parallel per chunk
      const [allShifts, allExpenses, allAdvances] = await Promise.all([
        Promise.all(chunks.map(chunk =>
          supabase.from('waiter_shifts').select('session_id, open_invoices').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(chunk =>
          supabase.from('expenses').select('session_id, amount').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(chunk =>
          supabase.from('advances').select('session_id, amount').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
      ]);

      // 5. Register transfers laden
      const { data: transfers, error: transfersError } = await supabase
        .from('register_transfers')
        .select('transfer_date, amount, direction')
        .eq('restaurant_id', restaurantId)
        .limit(10000);

      if (transfersError) throw transfersError;

      // 6. Pro Session direkt die DB-Werte verwenden + Deficit Chaining
      let carryOver = initialDeficit;

      return (sessions || []).map((session) => {
        const shifts = allShifts.filter((s) => s.session_id === session.id);
        const sessionExpenses = allExpenses.filter((e) => e.session_id === session.id);
        const sessionAdvances = allAdvances.filter((a) => a.session_id === session.id);

        // Direkt aus der Session-Tabelle
        const tagesumsatz = session.pos_total || 0;
        const kreditkarten = (session.terminal_1_total || 0) + (session.terminal_2_total || 0);
        const ordersmart = session.ordersmart_revenue || 0;
        const wolt = session.wolt_revenue || 0;
        const gutscheineEL = session.vouchers_redeemed || 0;
        const finedine = session.finedine_vouchers || 0;
        const gutscheineVK = session.vouchers_sold || 0;
        const einladung = session.einladung || 0;
        const sonstigeEinnahme = session.sonstige_einnahme || 0;
        const vorschuss = sessionAdvances.length > 0
          ? sessionAdvances.reduce((sum, a) => sum + a.amount, 0)
          : (session.vorschuss || 0);

        // Aggregierte Werte
        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        // BARGELD = Einnahmen - Abzüge (roh)
        const rawBargeld =
          tagesumsatz +
          gutscheineVK +
          sonstigeEinnahme -
          kreditkarten -
          ordersmart -
          wolt -
          gutscheineEL -
          finedine -
          einladung -
          totalOpenInvoices -
          vorschuss -
          totalExpenses;

        // Transfer-Effekt für diesen Tag berechnen
        const dayTransfers = (transfers || []).filter(t => t.transfer_date === session.session_date);
        const transferEffect = dayTransfers.reduce((sum, t) => {
          return t.direction === 'to_restaurant' ? sum + Number(t.amount) : sum - Number(t.amount);
        }, 0);

        // Deficit Chaining: Fehlbetrag Vortag + Transfers einrechnen
        const bargeld = rawBargeld + transferEffect + carryOver;
        carryOver = bargeld < 0 ? bargeld : 0;

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
          rawBargeld: rawBargeld + transferEffect,
        };
      });
    },
    enabled: !!restaurantId,
  });
}
