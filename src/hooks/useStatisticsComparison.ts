import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import type { StatsSummary } from './useStatistics';

import type { TimeRange, CustomDateRange } from './useStatistics';

interface ComparisonResult {
  current: StatsSummary;
  previous: StatsSummary;
  changes: {
    revenue: number;
    revenuePercent: number;
    avgDailyRevenue: number;
    avgDailyRevenuePercent: number;
    kitchenTip: number;
    kitchenTipPercent: number;
    waiterTip: number;
    waiterTipPercent: number;
    delivery: number;
    deliveryPercent: number;
    expenses: number;
    expensesPercent: number;
  };
  currentPeriodLabel: string;
  previousPeriodLabel: string;
}

async function fetchPeriodStats(startDate: Date, endDate: Date): Promise<StatsSummary> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .gte('session_date', format(startDate, 'yyyy-MM-dd'))
    .lte('session_date', format(endDate, 'yyyy-MM-dd'));

  if (sessionsError) throw sessionsError;

  const sessionIds = sessions?.map(s => s.id) || [];
  let waiterShifts: any[] = [];
  let expenses: any[] = [];

  if (sessionIds.length > 0) {
    const [shiftsResult, expResult] = await Promise.all([
      supabase.from('waiter_shifts').select('*').in('session_id', sessionIds),
      supabase.from('expenses').select('*').in('session_id', sessionIds),
    ]);
    waiterShifts = shiftsResult.data || [];
    expenses = expResult.data || [];
  }

  // Group by session for pool calculation
  const shiftsBySession: Record<string, any[]> = {};
  waiterShifts.forEach((shift: any) => {
    if (!shiftsBySession[shift.session_id]) shiftsBySession[shift.session_id] = [];
    shiftsBySession[shift.session_id].push(shift);
  });

  // Calculate totals
  const totalRevenue = waiterShifts.reduce((sum, w) => sum + (w.pos_sales || 0), 0);
  const totalKitchenTip = waiterShifts.reduce((sum, w) => sum + (w.kitchen_tip || 0), 0);
  
  // Calculate waiter tip using pool system
  let totalWaiterTip = 0;
  (sessions || []).forEach(session => {
    const sessionShifts = shiftsBySession[session.id] || [];
    if (sessionShifts.length === 0) return;
    
    let sessionPool = 0;
    sessionShifts.forEach((shift: any) => {
      const expected = (shift.kassiert_brutto || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
      const contribution = (shift.cash_handed_in || 0) - expected - (shift.kitchen_tip || 0);
      sessionPool += contribution;
    });
    totalWaiterTip += sessionPool;
  });

  const totalDelivery = (sessions || []).reduce((sum, s) => 
    sum + (s.ordersmart_revenue || 0) + (s.wolt_revenue || 0) + (s.takeaway_total || 0), 0);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const daysWithData = sessions?.length || 0;

  return {
    totalRevenue,
    totalKitchenTip,
    totalWaiterTip,
    totalDelivery,
    totalExpenses,
    avgDailyRevenue: daysWithData > 0 ? totalRevenue / daysWithData : 0,
    daysWithData,
  };
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function useStatisticsComparison(timeRange: TimeRange = 'month', customRange?: CustomDateRange) {
  return useQuery({
    queryKey: ['statistics-comparison', timeRange, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async (): Promise<ComparisonResult> => {
      const now = new Date();
      let currentStart: Date;
      let currentEnd: Date;
      let previousStart: Date;
      let previousEnd: Date;
      let currentLabel: string;
      let previousLabel: string;

      if (timeRange === 'custom' && customRange?.from && customRange?.to) {
        // Custom range: compare with same duration before
        currentStart = customRange.from;
        currentEnd = customRange.to;
        const durationMs = currentEnd.getTime() - currentStart.getTime();
        previousEnd = new Date(currentStart.getTime() - 1); // day before current start
        previousStart = new Date(previousEnd.getTime() - durationMs);
        currentLabel = 'Gewählter Zeitraum';
        previousLabel = 'Vorheriger Zeitraum';
      } else {
        switch (timeRange) {
          case 'week':
            currentStart = startOfWeek(now, { weekStartsOn: 1 });
            currentEnd = endOfWeek(now, { weekStartsOn: 1 });
            previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            currentLabel = 'Diese Woche';
            previousLabel = 'Letzte Woche';
            break;
          case '3months':
            currentStart = startOfMonth(subMonths(now, 2));
            currentEnd = endOfMonth(now);
            previousStart = startOfMonth(subMonths(now, 5));
            previousEnd = endOfMonth(subMonths(now, 3));
            currentLabel = 'Letzte 3 Monate';
            previousLabel = 'Vorherige 3 Monate';
            break;
          case 'month':
          default:
            currentStart = startOfMonth(now);
            currentEnd = endOfMonth(now);
            previousStart = startOfMonth(subMonths(now, 1));
            previousEnd = endOfMonth(subMonths(now, 1));
            currentLabel = 'Dieser Monat';
            previousLabel = 'Letzter Monat';
            break;
        }
      }

      const [current, previous] = await Promise.all([
        fetchPeriodStats(currentStart, currentEnd),
        fetchPeriodStats(previousStart, previousEnd),
      ]);

      return {
        current,
        previous,
        changes: {
          revenue: current.totalRevenue - previous.totalRevenue,
          revenuePercent: calculatePercentChange(current.totalRevenue, previous.totalRevenue),
          avgDailyRevenue: current.avgDailyRevenue - previous.avgDailyRevenue,
          avgDailyRevenuePercent: calculatePercentChange(current.avgDailyRevenue, previous.avgDailyRevenue),
          kitchenTip: current.totalKitchenTip - previous.totalKitchenTip,
          kitchenTipPercent: calculatePercentChange(current.totalKitchenTip, previous.totalKitchenTip),
          waiterTip: current.totalWaiterTip - previous.totalWaiterTip,
          waiterTipPercent: calculatePercentChange(current.totalWaiterTip, previous.totalWaiterTip),
          delivery: current.totalDelivery - previous.totalDelivery,
          deliveryPercent: calculatePercentChange(current.totalDelivery, previous.totalDelivery),
          expenses: current.totalExpenses - previous.totalExpenses,
          expensesPercent: calculatePercentChange(current.totalExpenses, previous.totalExpenses),
        },
        currentPeriodLabel: currentLabel,
        previousPeriodLabel: previousLabel,
      };
    },
  });
}
