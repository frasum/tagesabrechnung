import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, parseISO } from 'date-fns';

/**
 * Returns the cumulative cash balance carried over from the end of the
 * previous month (i.e. computed as of the first day of the selected month).
 *
 * Uses the existing `compute_carry_over` RPC: passing the first day of the
 * current month yields the chained operative balance up to (but excluding)
 * that day = end-of-previous-month balance.
 *
 * Add `pettyCash` on top to display the physical cash drawer total.
 */
export function usePreviousMonthCarryOver(
  restaurantId: string | null,
  selectedMonth: string | null,
) {
  return useQuery({
    queryKey: ['previous-month-carry-over', restaurantId, selectedMonth],
    queryFn: async (): Promise<number> => {
      if (!restaurantId || !selectedMonth) return 0;
      const monthStartDate = startOfMonth(parseISO(`${selectedMonth}-01`));
      const before = format(monthStartDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.rpc('compute_carry_over', {
        p_restaurant_id: restaurantId,
        p_before_date: before,
      });
      if (error) throw error;
      return Number(data) || 0;
    },
    enabled: !!restaurantId && !!selectedMonth,
  });
}
