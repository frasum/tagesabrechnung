import { useMemo } from 'react';
import { format } from 'date-fns';
import { useCashBalanceData } from './useCashBalanceData';

/**
 * Returns the carry-over from the day before the selected date.
 * Negative = deficit, positive = surplus, 0 = none.
 * Sourced from the unified cash chain in useCashBalanceData (includes
 * sessions, register transfers AND bank deposits).
 */
export function usePreviousDayDeficit(date: Date, restaurantId: string | null) {
  const { data: cashRows, isLoading, error } = useCashBalanceData(restaurantId);
  const dateStr = format(date, 'yyyy-MM-dd');

  const carry = useMemo(() => {
    if (!cashRows || cashRows.length === 0) return 0;

    // If today exists in the chain, use its previousCarry directly
    const today = cashRows.find(r => r.date === dateStr);
    if (today) return today.previousCarry;

    // Otherwise: take the remainingCash of the latest row strictly before today
    const previousRows = cashRows.filter(r => r.date < dateStr);
    if (previousRows.length === 0) return 0;
    return previousRows[previousRows.length - 1].remainingCash;
  }, [cashRows, dateStr]);

  return {
    data: carry,
    isLoading,
    error,
  };
}
