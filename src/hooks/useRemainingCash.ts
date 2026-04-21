import { useMemo } from 'react';
import { format } from 'date-fns';
import { useCashBalanceData } from './useCashBalanceData';
import { usePettyCash } from './useSettings';

/**
 * Returns the remaining cash in the till on the selected day, plus the
 * suggested skim amount to bring the till back to the petty-cash target.
 *
 * Single source of truth: the chained cash data from useCashBalanceData,
 * which now includes sessions + register transfers + bank deposits.
 */
export function useRemainingCash(restaurantId: string | null, selectedDate: Date) {
  const { data: cashRows, isLoading: cashLoading } = useCashBalanceData(restaurantId);
  const { pettyCash, isLoading: pettyCashLoading } = usePettyCash(restaurantId);

  const result = useMemo(() => {
    if (!cashRows || cashRows.length === 0) {
      return { remainingCash: pettyCash, todaySkimAmount: 0, totalSkimmed: 0 };
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Find the row for the selected date, or the latest row before it.
    let referenceRow = cashRows.find(r => r.date === dateStr);
    if (!referenceRow) {
      const previousRows = cashRows.filter(r => r.date < dateStr);
      referenceRow = previousRows[previousRows.length - 1];
    }

    const cashAfterDay = referenceRow ? referenceRow.remainingCash : 0;
    // Wechselgeldbestand = soll-Wechselgeld + verbleibendes Bargeld
    const remainingCash = pettyCash + cashAfterDay;

    // Suggested skim for today: amount above the petty cash target on today only
    let todaySkimAmount = 0;
    const todayRow = cashRows.find(r => r.date === dateStr);
    if (todayRow && todayRow.chainedBargeld > 0) {
      // Skim only the surplus beyond what's already deposited today
      todaySkimAmount = Math.max(0, todayRow.chainedBargeld - todayRow.depositEffect);
    }

    return { remainingCash, todaySkimAmount, totalSkimmed: 0 };
  }, [cashRows, pettyCash, selectedDate]);

  return {
    ...result,
    isLoading: cashLoading || pettyCashLoading,
  };
}
