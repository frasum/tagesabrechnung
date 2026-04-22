import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format } from 'date-fns';

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
  /** Sonstige Einnahmen (other income) for the day */
  sonstigeEinnahme: number;
  /** Pure daily cash for the day (without any carry-over), including transferEffect */
  rawBargeld: number;
  /**
   * Backwards-compatible per-day cash value (equal to rawBargeld).
   * Used by exports that sum daily values without chaining.
   */
  bargeld: number;
  /**
   * Display value for the daily "Bargeld" column:
   * = rawBargeld + min(0, rawBargeld of immediately preceding day with data).
   * Mirrors the "in den Tresor legen" amount shown in Tagesabrechnung,
   * so that a previous-day deficit is visibly netted in today's row.
   * Surpluses from the previous day are NOT carried (they belong to the bank-deposit pipeline).
   */
  displayBargeld: number;
  /** Net effect of register transfers on this day */
  transferEffect: number;
  /** Net effect of bank deposits on this day (always >= 0, subtracted from cash) */
  depositEffect: number;
  /** Carry-over (positive or negative) from previous day, after deposits */
  previousCarry: number;
  /** Daily chained cash before bank deposits (= rawBargeld + previousCarry) */
  chainedBargeld: number;
  /** Cumulative balance after all daily effects incl. deposits (single source of truth) */
  remainingCash: number;
}

function defaultFromDate(): string {
  return format(subMonths(new Date(), 6), 'yyyy-MM-dd');
}

export function useCashBalanceData(restaurantId: string | null, fromDate?: string) {
  const effectiveFromDate = fromDate ?? defaultFromDate();

  return useQuery({
    queryKey: ['cash-balance', restaurantId, effectiveFromDate],
    queryFn: async (): Promise<CashBalanceRow[]> => {
      if (!restaurantId) return [];

      // 0. Compute carry-over from DB function + load sessions in parallel
      const [carryOverResult, sessionsResult] = await Promise.all([
        supabase.rpc('compute_carry_over', {
          p_restaurant_id: restaurantId,
          p_before_date: effectiveFromDate,
        }),
        supabase
          .from('sessions')
          .select('id, session_date, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, takeaway_total, vouchers_redeemed, finedine_vouchers, vouchers_sold, einladung, vorschuss, sonstige_einnahme')
          .eq('restaurant_id', restaurantId)
          .gte('session_date', effectiveFromDate)
          .order('session_date', { ascending: true })
          .limit(10000),
      ]);

      if (carryOverResult.error) throw carryOverResult.error;
      const initialCarryOver = Number(carryOverResult.data) || 0;

      const sessions = sessionsResult.data;
      if (sessionsResult.error) throw sessionsResult.error;

      const sessionIds = (sessions || []).map(s => s.id);

      // Batch session IDs in chunks of 500
      const chunkSize = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        chunks.push(sessionIds.slice(i, i + chunkSize));
      }

      // Load waiter_shifts, expenses, advances, transfers, deposits in parallel
      const [allShifts, allExpenses, allAdvances, transfersResult, depositsResult] = await Promise.all([
        Promise.all(chunks.map(chunk =>
          supabase.from('waiter_shifts').select('session_id, open_invoices').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(chunk =>
          supabase.from('expenses').select('session_id, amount').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        Promise.all(chunks.map(chunk =>
          supabase.from('advances').select('session_id, amount').in('session_id', chunk).limit(10000)
        )).then(results => results.flatMap(r => { if (r.error) throw r.error; return r.data || []; })),
        supabase
          .from('register_transfers')
          .select('transfer_date, amount, direction')
          .eq('restaurant_id', restaurantId)
          .gte('transfer_date', effectiveFromDate)
          .limit(10000),
        supabase
          .from('bank_deposits')
          .select('deposit_date, amount')
          .eq('restaurant_id', restaurantId)
          .gte('deposit_date', effectiveFromDate)
          .limit(10000),
      ]);

      if (transfersResult.error) throw transfersResult.error;
      if (depositsResult.error) throw depositsResult.error;

      const transfers = transfersResult.data || [];
      const deposits = depositsResult.data || [];

      // Build unified date map
      const sessionMap = new Map<string, NonNullable<typeof sessions>[0]>();
      for (const s of (sessions || [])) {
        sessionMap.set(s.session_date, s);
      }

      const allDates = [...new Set([
        ...(sessions || []).map(s => s.session_date),
        ...transfers.map(t => t.transfer_date).filter(d => !sessionMap.has(d)),
        ...deposits.map(d => d.deposit_date).filter(d => !sessionMap.has(d)),
      ])].sort();

      if (allDates.length === 0) return [];

      let carryOver = initialCarryOver;

      let prevRawBargeld = 0;

      return allDates.map((date) => {
        const session = sessionMap.get(date);
        const shifts = session ? allShifts.filter((s) => s.session_id === session.id) : [];
        const sessionExpenses = session ? allExpenses.filter((e) => e.session_id === session.id) : [];
        const sessionAdvances = session ? allAdvances.filter((a) => a.session_id === session.id) : [];

        const tagesumsatz = session?.pos_total || 0;
        const kreditkarten = (session?.terminal_1_total || 0) + (session?.terminal_2_total || 0);
        const ordersmart = session?.ordersmart_revenue || 0;
        const wolt = session?.wolt_revenue || 0;
        const gutscheineEL = session?.vouchers_redeemed || 0;
        const finedine = session?.finedine_vouchers || 0;
        const gutscheineVK = session?.vouchers_sold || 0;
        const einladung = session?.einladung || 0;
        const sonstigeEinnahme = session?.sonstige_einnahme || 0;
        const vorschuss = sessionAdvances.length > 0
          ? sessionAdvances.reduce((sum, a) => sum + a.amount, 0)
          : (session?.vorschuss || 0);

        const totalOpenInvoices = shifts.reduce((sum, w) => sum + (w.open_invoices || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

        const dailyCash =
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

        const transferEffect = transfers
          .filter(t => t.transfer_date === date)
          .reduce((sum, t) => t.direction === 'to_restaurant' ? sum + Number(t.amount) : sum - Number(t.amount), 0);

        const depositEffect = deposits
          .filter(d => d.deposit_date === date)
          .reduce((sum, d) => sum + Number(d.amount), 0);

        const previousCarry = carryOver;
        const rawBargeld = dailyCash + transferEffect;
        const chainedBargeld = rawBargeld + previousCarry;
        const remainingCash = chainedBargeld - depositEffect;

        // Display value: net previous day's deficit only (surplus stays out)
        const displayBargeld = rawBargeld + Math.min(0, prevRawBargeld);
        prevRawBargeld = rawBargeld;

        // Chain forward (positive AND negative)
        carryOver = remainingCash;

        return {
          date,
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
          sonstigeEinnahme,
          rawBargeld,
          // Keep legacy `bargeld` semantics for exports = pure daily (no carry)
          bargeld: rawBargeld,
          displayBargeld,
          transferEffect,
          depositEffect,
          previousCarry,
          chainedBargeld,
          remainingCash,
        };
      });
    },
    enabled: !!restaurantId,
  });
}
