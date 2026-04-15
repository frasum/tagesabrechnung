import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAllTeamMembers, countPoolShares } from '@/lib/waiterTeamUtils';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export interface DailyStats {
  date: string;
  kellnerUmsatz: number;
  kitchenTip: number;
  waiterTip: number;
  deliveryRevenue: number;
  kreditkarten: number;
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
  restaurantId?: string;
}

export interface KitchenTipStats {
  name: string;
  totalHours: number;
  totalTip: number;
  avgTipPerHour: number;
  restaurantId?: string;
}

export type TimeRange = 'week' | 'month' | '3months' | 'custom';

export interface CustomDateRange {
  from: Date;
  to: Date;
}

export function useStatistics(timeRange: TimeRange = 'month', customRange?: CustomDateRange, restaurantId?: string | null, restaurantIds?: string[]) {
  const effectiveIds = restaurantIds ?? (restaurantId ? [restaurantId] : []);
  const cacheKey = restaurantIds ? [...restaurantIds].sort().join(',') : restaurantId;
  return useQuery({
    queryKey: ['statistics', timeRange, customRange?.from?.toISOString(), customRange?.to?.toISOString(), cacheKey],
    enabled: effectiveIds.length > 0,
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
      let sessionsQuery = supabase
        .from('sessions')
        .select('id, session_date, restaurant_id, pos_total, terminal_1_total, terminal_2_total, ordersmart_revenue, wolt_revenue, takeaway_total, vouchers_redeemed, finedine_vouchers, vouchers_sold, einladung, vorschuss, sonstige_einnahme, card_total_gl')
        .gte('session_date', format(startDate, 'yyyy-MM-dd'))
        .lte('session_date', format(endDate, 'yyyy-MM-dd'))
        .order('session_date', { ascending: true });
      
      if (effectiveIds.length === 1) {
        sessionsQuery = sessionsQuery.eq('restaurant_id', effectiveIds[0]);
      } else {
        sessionsQuery = sessionsQuery.in('restaurant_id', effectiveIds);
      }
      
      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) throw sessionsError;

      // Fetch all waiter shifts for these sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      let waiterShifts: any[] = [];
      let expenses: any[] = [];
      let kitchenShifts: any[] = [];
      const canonicalNames: Record<string, string> = {};

      if (sessionIds.length > 0) {
        const [shiftsResult, expResult, kitchenResult, staffResult] = await Promise.all([
          supabase.from('waiter_shifts').select('session_id, waiter_name, pos_sales, kassiert_brutto, card_total, hilf_mahl, open_invoices, cash_handed_in, differenz, kitchen_tip, participates_in_pool, second_waiter_name, additional_waiters').in('session_id', sessionIds),
          supabase.from('expenses').select('session_id, amount').in('session_id', sessionIds),
          supabase.from('kitchen_shifts').select('session_id, staff_name, hours_worked').in('session_id', sessionIds),
          supabase.from('staff').select('name'),
        ]);
        waiterShifts = shiftsResult.data || [];
        expenses = expResult.data || [];
        kitchenShifts = kitchenResult.data || [];
        
        // Build canonical name map for deduplication
        if (staffResult.data) {
          for (const s of staffResult.data) {
            canonicalNames[s.name.toLowerCase().trim()] = s.name;
          }
        }
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

      // Calculate daily stats — exclude sessions without any waiter shifts
      const dailyStats: DailyStats[] = (sessions || [])
        .filter(session => (shiftsBySession[session.id] || []).length > 0)
        .map(session => {
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

        // Kreditkarten = alle unbaren Zahlungen (Terminals + Wolt + OrderSmart)
        const kreditkarten = (session.terminal_1_total || 0) +
          (session.terminal_2_total || 0) +
          (session.ordersmart_revenue || 0) +
          (session.wolt_revenue || 0);

        return {
          date: session.session_date,
          kellnerUmsatz,
          kitchenTip,
          waiterTip,
          deliveryRevenue,
          kreditkarten,
          expenses: totalExpenses,
        };
      });

      // Note: delivery breakdown labels are static here; 
      // consumers should use getLabel() to display these names
      const totalTakeaway = (sessions || []).reduce((sum, s) => sum + (s.takeaway_total || 0), 0);
      const totalOrdersmart = (sessions || []).reduce((sum, s) => sum + (s.ordersmart_revenue || 0), 0);
      const totalWolt = (sessions || []).reduce((sum, s) => sum + (s.wolt_revenue || 0), 0);
      const vectronTakeaway = totalTakeaway - totalOrdersmart - totalWolt;

      const deliveryBreakdown: DeliveryBreakdown[] = [
        { name: 'takeaway_total', value: Math.max(0, vectronTakeaway) },
        { name: 'ordersmart_revenue', value: totalOrdersmart },
        { name: 'wolt_revenue', value: totalWolt },
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
      const isMultiRestaurant = effectiveIds.length > 1;
      const waiterTipMap: Record<string, { totalPoolShare: number; shiftsCount: number; displayName: string; restaurantId?: string }> = {};
      
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
        
        // Distribute equally among all waiters in this session (counting team members)
        let totalShares = countPoolShares(sessionShifts.map((shift: any) => ({
          waiter_name: shift.waiter_name,
          second_waiter_name: shift.second_waiter_name,
          additional_waiters: shift.additional_waiters || [],
          participates_in_pool: shift.participates_in_pool ?? true,
        })));
        const sharePerWaiter = totalShares > 0 ? sessionPool / totalShares : 0;
        
        sessionShifts.forEach((shift: any) => {
          const allMembers = getAllTeamMembers({
            waiter_name: shift.waiter_name,
            second_waiter_name: shift.second_waiter_name,
            additional_waiters: shift.additional_waiters || [],
          });
          allMembers.forEach((name: string) => {
            const normalizedName = name.toLowerCase().trim();
            const mapKey = isMultiRestaurant ? `${session.restaurant_id}_${normalizedName}` : normalizedName;
            if (!waiterTipMap[mapKey]) {
              waiterTipMap[mapKey] = { totalPoolShare: 0, shiftsCount: 0, displayName: canonicalNames[normalizedName] || name, restaurantId: isMultiRestaurant ? session.restaurant_id : undefined };
            }
            waiterTipMap[mapKey].totalPoolShare += sharePerWaiter;
            waiterTipMap[mapKey].shiftsCount += 1;
          });
        });
      });

      const waiterTipStats: WaiterTipStats[] = Object.entries(waiterTipMap)
        .map(([_, data]) => ({
          name: data.displayName,
          totalTip: data.totalPoolShare,
          shiftsCount: data.shiftsCount,
          avgTipPerShift: data.shiftsCount > 0 ? data.totalPoolShare / data.shiftsCount : 0,
          restaurantId: data.restaurantId,
        }))
        .sort((a, b) => b.totalTip - a.totalTip);

      // Calculate kitchen tip stats per person
      // For each session, calculate proportional tip based on hours worked
      const kitchenTipMap: Record<string, { totalTip: number; totalHours: number; displayName: string; restaurantId?: string }> = {};
      
      (sessions || []).forEach(session => {
        const sessionWaiterShifts = shiftsBySession[session.id] || [];
        const sessionKitchenShifts = kitchenShiftsBySession[session.id] || [];
        
        const kitchenTipPool = sessionWaiterShifts.reduce(
          (sum: number, w: any) => sum + (w.kitchen_tip || 0), 0
        );
        
        const totalHours = sessionKitchenShifts.reduce(
          (sum: number, k: any) => sum + (k.hours_worked || 0), 0
        );
        
        if (totalHours > 0 && kitchenTipPool > 0) {
          sessionKitchenShifts.forEach((shift: any) => {
            const normalizedName = shift.staff_name.toLowerCase().trim();
            const mapKey = isMultiRestaurant ? `${session.restaurant_id}_${normalizedName}` : normalizedName;
            const hours = shift.hours_worked || 0;
            const personalTip = (hours / totalHours) * kitchenTipPool;
            
            if (!kitchenTipMap[mapKey]) {
              kitchenTipMap[mapKey] = { totalTip: 0, totalHours: 0, displayName: canonicalNames[normalizedName] || shift.staff_name, restaurantId: isMultiRestaurant ? session.restaurant_id : undefined };
            }
            kitchenTipMap[mapKey].totalTip += personalTip;
            kitchenTipMap[mapKey].totalHours += hours;
          });
        }
      });

      const kitchenTipStats: KitchenTipStats[] = Object.entries(kitchenTipMap)
        .map(([_, data]) => ({
          name: data.displayName,
          totalTip: data.totalTip,
          totalHours: data.totalHours,
          avgTipPerHour: data.totalHours > 0 ? data.totalTip / data.totalHours : 0,
          restaurantId: data.restaurantId,
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
