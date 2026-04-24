import { useMemo } from 'react';
import { format } from 'date-fns';
import { useCashBalanceData } from './useCashBalanceData';
import { usePettyCash } from './useSettings';
import { usePreviousDayDeficit } from './usePreviousDayDeficit';

/**
 * Day-normalized cash logic for the Daily Summary view.
 *
 * Semantics (per project memory: petty-cash target is 2000 €):
 *   previousOperativeDeficit (≤ 0): rolling unbalanced deficit from prior days.
 *     A negative day stays "open" until a future day operatively compensates it.
 *     Surpluses are skimmed away each day (tresor) and never inflate this value.
 *     Bank deposits and register transfers are intentionally NOT considered here —
 *     those belong to the cumulative Bargeldbestand pipeline.
 *
 *   diffWechselgeld = today's rawBargeld + previousOperativeDeficit
 *   skim            = max(0, diffWechselgeld)
 *   remainingCash   = pettyCash + diffWechselgeld - skim
 *     → exactly pettyCash on a balanced/surplus day,
 *       below pettyCash on an open-deficit day (e.g. 1.818,52 €).
 */
export function useRemainingCash(restaurantId: string | null, selectedDate: Date) {
  const { data: cashRows, isLoading: cashLoading } = useCashBalanceData(restaurantId);
  const { pettyCash, isLoading: pettyCashLoading } = usePettyCash(restaurantId);
  const { data: previousOperativeDeficit = 0 } = usePreviousDayDeficit(selectedDate, restaurantId);

  const result = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Today's pure daily cash effect (without any carry-over)
    const todayRow = cashRows?.find(r => r.date === dateStr);
    const rawBargeld = todayRow ? todayRow.rawBargeld : 0;

    // Defensive cap: previousOperativeDeficit is already ≤ 0 by construction
    const safeDeficit = Math.min(previousOperativeDeficit, 0);

    const diffWechselgeld = rawBargeld + safeDeficit;
    const todaySkimAmount = Math.max(0, diffWechselgeld);
    const remainingCash = pettyCash + diffWechselgeld - todaySkimAmount;

    return { remainingCash, todaySkimAmount, totalSkimmed: 0, diffWechselgeld };
  }, [cashRows, pettyCash, selectedDate, previousOperativeDeficit]);

  return {
    ...result,
    isLoading: cashLoading || pettyCashLoading,
  };
}
