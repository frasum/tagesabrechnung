import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export interface DailyStats {
  date: string;
  kellnerUmsatz: number;
  kitchenTip: number;
  waiterTip: number;
  deliveryRevenue: number;
  bargeld: number;
  expenses: number;
}

export interface DeliveryBreakdown {
  name: string;
  value: number;
}

export interface StatsSummary {
  totalRevenue: number;
  totalKitchenTip: number;
  totalWaiterTip: number;
  totalDelivery: number;
  totalExpenses: number;
  avgDailyRevenue: number;
  daysWithData: number;
}

type TimeRange = 'week' | 'month' | '3months';

export function useStatistics(timeRange: TimeRange = 'month') {
  return useQuery({
    queryKey: ['statistics', timeRange],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case '3months':
          startDate = startOfMonth(subMonths(now, 2));
          endDate = endOfMonth(now);
          break;
        case 'month':
        default:
          startDate = startOfMonth(subMonths(now, 0));
          endDate = endOfMonth(now);
          break;
      }

      // Fetch sessions in the date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .gte('session_date', format(startDate, 'yyyy-MM-dd'))
        .lte('session_date', format(endDate, 'yyyy-MM-dd'))
        .order('session_date', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch all waiter shifts for these sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      let waiterShifts: any[] = [];
      let expenses: any[] = [];

      if (sessionIds.length > 0) {
        const { data: shifts } = await supabase
          .from('waiter_shifts')
          .select('*')
          .in('session_id', sessionIds);
        waiterShifts = shifts || [];

        const { data: exp } = await supabase
          .from('expenses')
          .select('*')
          .in('session_id', sessionIds);
        expenses = exp || [];
      }

      // Group waiter shifts and expenses by session
      const shiftsBySession = waiterShifts.reduce((acc, shift) => {
        if (!acc[shift.session_id]) acc[shift.session_id] = [];
        acc[shift.session_id].push(shift);
        return acc;
      }, {} as Record<string, any[]>);

      const expensesBySession = expenses.reduce((acc, expense) => {
        if (!acc[expense.session_id]) acc[expense.session_id] = [];
        acc[expense.session_id].push(expense);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate daily stats
      const dailyStats: DailyStats[] = (sessions || []).map(session => {
        const sessionShifts = shiftsBySession[session.id] || [];
        const sessionExpenses = expensesBySession[session.id] || [];

        const kellnerUmsatz = sessionShifts.reduce((sum: number, w: any) => sum + (w.pos_sales || 0), 0);
        const totalHilfMahl = sessionShifts.reduce((sum: number, w: any) => sum + (w.hilf_mahl || 0), 0);
        const totalOpenInvoices = sessionShifts.reduce((sum: number, w: any) => sum + (w.open_invoices || 0), 0);
        const kitchenTip = sessionShifts.reduce((sum: number, w: any) => sum + (w.kitchen_tip || 0), 0);
        const waiterTip = sessionShifts.reduce((sum: number, w: any) => {
          return sum + ((w.cash_handed_in || 0) - (w.differenz || 0) - (w.kitchen_tip || 0));
        }, 0);
        const totalExpenses = sessionExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

        const deliveryRevenue = 
          (session.ordersmart_revenue || 0) +
          (session.gustoco_revenue || 0) +
          (session.orderhut_revenue || 0) +
          (session.wolt_revenue || 0) +
          (session.ubereats_revenue || 0);

        const bargeld = kellnerUmsatz +
          (session.vouchers_sold || 0) +
          (session.sonstige_einnahme || 0) -
          (session.terminal_1_total || 0) -
          (session.terminal_2_total || 0) -
          (session.opentabs_deduction || 0) -
          (session.vouchers_redeemed || 0) -
          (session.vorschuss || 0) -
          (session.einladung || 0) -
          totalOpenInvoices -
          totalExpenses +
          totalHilfMahl -
          deliveryRevenue -
          (session.finedine_vouchers || 0);

        return {
          date: session.session_date,
          kellnerUmsatz,
          kitchenTip,
          waiterTip,
          deliveryRevenue,
          bargeld,
          expenses: totalExpenses,
        };
      });

      // Calculate delivery breakdown
      const deliveryBreakdown: DeliveryBreakdown[] = [
        { name: 'OrderSmart', value: (sessions || []).reduce((sum, s) => sum + (s.ordersmart_revenue || 0), 0) },
        { name: 'Gustoco', value: (sessions || []).reduce((sum, s) => sum + (s.gustoco_revenue || 0), 0) },
        { name: 'Orderhut', value: (sessions || []).reduce((sum, s) => sum + (s.orderhut_revenue || 0), 0) },
        { name: 'Wolt', value: (sessions || []).reduce((sum, s) => sum + (s.wolt_revenue || 0), 0) },
        { name: 'UberEats', value: (sessions || []).reduce((sum, s) => sum + (s.ubereats_revenue || 0), 0) },
      ].filter(d => d.value > 0);

      // Calculate summary
      const summary: StatsSummary = {
        totalRevenue: dailyStats.reduce((sum, d) => sum + d.kellnerUmsatz, 0),
        totalKitchenTip: dailyStats.reduce((sum, d) => sum + d.kitchenTip, 0),
        totalWaiterTip: dailyStats.reduce((sum, d) => sum + d.waiterTip, 0),
        totalDelivery: dailyStats.reduce((sum, d) => sum + d.deliveryRevenue, 0),
        totalExpenses: dailyStats.reduce((sum, d) => sum + d.expenses, 0),
        avgDailyRevenue: dailyStats.length > 0 
          ? dailyStats.reduce((sum, d) => sum + d.kellnerUmsatz, 0) / dailyStats.length 
          : 0,
        daysWithData: dailyStats.length,
      };

      return {
        dailyStats,
        deliveryBreakdown,
        summary,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      };
    },
  });
}
