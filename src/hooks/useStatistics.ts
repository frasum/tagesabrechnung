import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

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

export interface WaiterTipStats {
  name: string;
  totalTip: number;
  shiftsCount: number;
  avgTipPerShift: number;
}

export interface KitchenTipStats {
  name: string;
  totalHours: number;
  totalTip: number;
  avgTipPerHour: number;
}

export type TimeRange = 'week' | 'month' | '3months' | 'custom';

export interface CustomDateRange {
  from: Date;
  to: Date;
}

export function useStatistics(timeRange: TimeRange = 'month', customRange?: CustomDateRange) {
  return useQuery({
    queryKey: ['statistics', timeRange, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (timeRange === 'custom' && customRange?.from && customRange?.to) {
        startDate = customRange.from;
        endDate = customRange.to;
      } else {
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
      let kitchenShifts: any[] = [];

      if (sessionIds.length > 0) {
        const [shiftsResult, expResult, kitchenResult] = await Promise.all([
          supabase.from('waiter_shifts').select('*').in('session_id', sessionIds),
          supabase.from('expenses').select('*').in('session_id', sessionIds),
          supabase.from('kitchen_shifts').select('*').in('session_id', sessionIds),
        ]);
        waiterShifts = shiftsResult.data || [];
        expenses = expResult.data || [];
        kitchenShifts = kitchenResult.data || [];
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

      const kitchenShiftsBySession = kitchenShifts.reduce((acc, shift) => {
        if (!acc[shift.session_id]) acc[shift.session_id] = [];
        acc[shift.session_id].push(shift);
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
          (session.wolt_revenue || 0) +
          (session.takeaway_total || 0);

        const bargeld = kellnerUmsatz +
          (session.vouchers_sold || 0) +
          (session.sonstige_einnahme || 0) -
          (session.terminal_1_total || 0) -
          (session.terminal_2_total || 0) -
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
        { name: 'Takeaway GL', value: (sessions || []).reduce((sum, s) => sum + (s.takeaway_total || 0), 0) },
        { name: 'OrderSmart', value: (sessions || []).reduce((sum, s) => sum + (s.ordersmart_revenue || 0), 0) },
        { name: 'Wolt', value: (sessions || []).reduce((sum, s) => sum + (s.wolt_revenue || 0), 0) },
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

      // Calculate waiter tip stats per person using pool system
      // For each session, calculate the pool and distribute equally
      const waiterTipMap: Record<string, { totalPoolShare: number; shiftsCount: number }> = {};
      
      (sessions || []).forEach(session => {
        const sessionShifts = shiftsBySession[session.id] || [];
        if (sessionShifts.length === 0) return;
        
        // Calculate pool for this session
        let sessionPool = 0;
        sessionShifts.forEach((shift: any) => {
          const expected = (shift.kassiert_brutto || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
          const contribution = (shift.cash_handed_in || 0) - expected - (shift.kitchen_tip || 0);
          sessionPool += contribution;
        });
        
        // Distribute equally among all waiters in this session
        const sharePerWaiter = sessionPool / sessionShifts.length;
        
        sessionShifts.forEach((shift: any) => {
          const name = shift.waiter_name;
          if (!waiterTipMap[name]) {
            waiterTipMap[name] = { totalPoolShare: 0, shiftsCount: 0 };
          }
          waiterTipMap[name].totalPoolShare += sharePerWaiter;
          waiterTipMap[name].shiftsCount += 1;
        });
      });

      const waiterTipStats: WaiterTipStats[] = Object.entries(waiterTipMap)
        .map(([name, data]) => ({
          name,
          totalTip: data.totalPoolShare,
          shiftsCount: data.shiftsCount,
          avgTipPerShift: data.shiftsCount > 0 ? data.totalPoolShare / data.shiftsCount : 0,
        }))
        .sort((a, b) => b.totalTip - a.totalTip);

      // Calculate kitchen tip stats per person
      // For each session, calculate proportional tip based on hours worked
      const kitchenTipMap: Record<string, { totalTip: number; totalHours: number }> = {};
      
      (sessions || []).forEach(session => {
        const sessionWaiterShifts = shiftsBySession[session.id] || [];
        const sessionKitchenShifts = kitchenShiftsBySession[session.id] || [];
        
        // Total kitchen tip pool for this session
        const kitchenTipPool = sessionWaiterShifts.reduce(
          (sum: number, w: any) => sum + (w.kitchen_tip || 0), 
          0
        );
        
        // Total hours worked by all kitchen staff in this session
        const totalHours = sessionKitchenShifts.reduce(
          (sum: number, k: any) => sum + (k.hours_worked || 0), 
          0
        );
        
        // Distribute proportionally
        if (totalHours > 0 && kitchenTipPool > 0) {
          sessionKitchenShifts.forEach((shift: any) => {
            const name = shift.staff_name;
            const hours = shift.hours_worked || 0;
            const personalTip = (hours / totalHours) * kitchenTipPool;
            
            if (!kitchenTipMap[name]) {
              kitchenTipMap[name] = { totalTip: 0, totalHours: 0 };
            }
            kitchenTipMap[name].totalTip += personalTip;
            kitchenTipMap[name].totalHours += hours;
          });
        }
      });

      const kitchenTipStats: KitchenTipStats[] = Object.entries(kitchenTipMap)
        .map(([name, data]) => ({
          name,
          totalTip: data.totalTip,
          totalHours: data.totalHours,
          avgTipPerHour: data.totalHours > 0 ? data.totalTip / data.totalHours : 0,
        }))
        .sort((a, b) => b.totalTip - a.totalTip);

      return {
        dailyStats,
        deliveryBreakdown,
        summary,
        waiterTipStats,
        kitchenTipStats,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      };
    },
  });
}
