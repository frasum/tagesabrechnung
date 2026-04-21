import { useMemo } from 'react';
import { format } from 'date-fns';
import { useCashBalanceData } from './useCashBalanceData';
import { usePettyCash } from './useSettings';
import { usePreviousDayDeficit } from './usePreviousDayDeficit';

/**
 * Day-normalized cash logic for the Daily Summary view.
 *
 * Semantics (per project memory: petty-cash target is 2000 €):
 *   diffWechselgeld = today's raw cash effect + min(previousCarry, 0)
 *     → only NEGATIVE previous-day carry counts as today's deficit;
 *       positive historical surplus belongs to the bank-deposit pipeline
 *       and is NOT mixed into today's display.
 *   skim            = max(0, diffWechselgeld)        // only today's surplus
 *   remainingCash   = pettyCash + diffWechselgeld - skim
 *     → exactly pettyCash on a balanced/surplus day;
 *       below pettyCash on a deficit day (e.g. 1.800 €).
 *
 * Cumulative carry-over (incl. positive historical surplus) is shown
 * separately on the Cash Balance page, not here.
 */
export function useRemainingCash(restaurantId: string | null, selectedDate: Date) {
  const { data: cashRows, isLoading: cashLoading } = useCashBalanceData(restaurantId);
  const { pettyCash, isLoading: pettyCashLoading } = usePettyCash(restaurantId);
  const { data: previousCarry = 0 } = usePreviousDayDeficit(selectedDate, restaurantId);

  const result = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Today's pure daily cash effect (without any carry-over)
    const todayRow = cashRows?.find(r => r.date === dateStr);
    const rawBargeld = todayRow ? todayRow.rawBargeld : 0;

    // Only NEGATIVE previous carry leaks into the daily petty-cash view
    const previousDeficitOnly = Math.min(previousCarry, 0);

    const diffWechselgeld = rawBargeld + previousDeficitOnly;
    const todaySkimAmount = Math.max(0, diffWechselgeld);
    const remainingCash = pettyCash + diffWechselgeld - todaySkimAmount;

    return { remainingCash, todaySkimAmount, totalSkimmed: 0, diffWechselgeld };
  }, [cashRows, pettyCash, selectedDate, previousCarry]);

  return {
    ...result,
    isLoading: cashLoading || pettyCashLoading,
  };
}
