import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

export interface MonthlyStaffTip {
  name: string;
  hours: number;
  tip: number;
}

export interface MonthlyTipData {
  month: string; // "YYYY-MM"
  monthLabel: string; // "Februar 2026"
  waiterTips: MonthlyStaffTip[];
  kitchenTips: MonthlyStaffTip[];
  totalWaiterTip: number;
  totalKitchenTip: number;
  totalKitchenHours: number;
}

async function fetchMonthlyStaffTips(monthsBack: number = 12, restaurantIds?: string[]): Promise<MonthlyTipData[]> {
  const now = new Date();
  const monthsData: MonthlyTipData[] = [];

  // Fetch all sessions from the last N months
  const startDate = startOfMonth(subMonths(now, monthsBack - 1));
  const endDate = endOfMonth(now);

  const query = supabase
    .from('sessions')
    .select('id, session_date')
    .gte('session_date', format(startDate, 'yyyy-MM-dd'))
    .lte('session_date', format(endDate, 'yyyy-MM-dd'))
    .order('session_date', { ascending: true });

  if (restaurantIds && restaurantIds.length > 0) {
    query.in('restaurant_id', restaurantIds);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);

  // Fetch staff pool status, waiter shifts, and kitchen shifts in parallel
  const [waiterShiftsResult, kitchenShiftsResult, staffResult] = await Promise.all([
    supabase
      .from('waiter_shifts')
      .select('*')
      .in('session_id', sessionIds),
    supabase
      .from('kitchen_shifts')
      .select('*')
      .in('session_id', sessionIds),
    supabase
      .from('staff')
      .select('name, participates_in_pool'),
  ]);

  if (waiterShiftsResult.error) throw waiterShiftsResult.error;
  if (kitchenShiftsResult.error) throw kitchenShiftsResult.error;

  const waiterShifts = waiterShiftsResult.data || [];
  const kitchenShifts = kitchenShiftsResult.data || [];

  // Build pool participation lookup by staff name
  const poolStatusMap: Record<string, boolean> = {};
  if (staffResult.data) {
    for (const s of staffResult.data) {
      poolStatusMap[s.name] = s.participates_in_pool;
    }
  }
  const isPoolParticipant = (name: string) => poolStatusMap[name] !== false;

  // Group sessions by month
  const sessionsByMonth: Record<string, typeof sessions> = {};
  sessions.forEach(session => {
    const monthKey = session.session_date.substring(0, 7); // "YYYY-MM"
    if (!sessionsByMonth[monthKey]) {
      sessionsByMonth[monthKey] = [];
    }
    sessionsByMonth[monthKey].push(session);
  });

  // Process each month
  for (const [monthKey, monthSessions] of Object.entries(sessionsByMonth)) {
    const sessionIdsInMonth = monthSessions.map(s => s.id);
    
    // Get waiter shifts for this month
    const monthWaiterShifts = waiterShifts.filter(ws => sessionIdsInMonth.includes(ws.session_id));
    const monthKitchenShifts = kitchenShifts.filter(ks => sessionIdsInMonth.includes(ks.session_id));

    // Calculate waiter tips per session, then aggregate per waiter
    const waiterTipsMap: Record<string, { tip: number; hours: number }> = {};
    
    // Group waiter shifts by session to calculate pool per session
    const waiterShiftsBySession: Record<string, typeof monthWaiterShifts> = {};
    monthWaiterShifts.forEach(ws => {
      if (!waiterShiftsBySession[ws.session_id]) {
        waiterShiftsBySession[ws.session_id] = [];
      }
      waiterShiftsBySession[ws.session_id].push(ws);
    });

    // For each session, calculate the pool and distribute equally (team shifts count as 2, only if participates_in_pool)
    for (const [sessionId, shiftsInSession] of Object.entries(waiterShiftsBySession)) {
      // Calculate session pool: sum of all differenz values (tip contributions)
      const sessionPool = shiftsInSession.reduce((sum, s) => {
        const expected = (s.pos_sales || 0) + (s.hilf_mahl || 0) - (s.open_invoices || 0) - (s.card_total || 0);
        return sum + ((s.cash_handed_in || 0) - expected - (s.kitchen_tip || 0));
      }, 0);
      
      // Count waiter shares (team shifts use additional_waiters, only if participates_in_pool)
      const waiterShareCount = shiftsInSession.reduce((count, s) => {
        if (!s.participates_in_pool) return count;
        const additionalCount = ((s as any).additional_waiters?.length || 0);
        return count + 1 + additionalCount;
      }, 0);
      
      if (waiterShareCount > 0) {
        const tipPerWaiter = sessionPool / waiterShareCount;
        shiftsInSession.forEach(ws => {
          // Skip waiters who don't participate in pool
          if (!ws.participates_in_pool) return;
          
          const waiterHours = ws.hours_worked || 0;
          
          // Primary waiter
          if (!waiterTipsMap[ws.waiter_name]) {
            waiterTipsMap[ws.waiter_name] = { tip: 0, hours: 0 };
          }
          waiterTipsMap[ws.waiter_name].tip += tipPerWaiter;
          waiterTipsMap[ws.waiter_name].hours += waiterHours;
          
          // Additional waiters (no hours tracked for them)
          const additionalWaiters: string[] = (ws as any).additional_waiters || [];
          for (const name of additionalWaiters) {
            if (!waiterTipsMap[name]) {
              waiterTipsMap[name] = { tip: 0, hours: 0 };
            }
            waiterTipsMap[name].tip += tipPerWaiter;
          }
        });
      }
    }

    // Calculate kitchen tips proportionally by hours
    const kitchenTipsMap: Record<string, { hours: number; tip: number }> = {};
    
    // Group kitchen shifts by session
    const kitchenShiftsBySession: Record<string, typeof monthKitchenShifts> = {};
    monthKitchenShifts.forEach(ks => {
      if (!kitchenShiftsBySession[ks.session_id]) {
        kitchenShiftsBySession[ks.session_id] = [];
      }
      kitchenShiftsBySession[ks.session_id].push(ks);
    });

    // For each session, calculate kitchen pool and distribute by hours
    for (const [sessionId, kitchenShiftsInSession] of Object.entries(kitchenShiftsBySession)) {
      // Get total kitchen tip for this session from waiter shifts
      const sessionWaiterShifts = waiterShiftsBySession[sessionId] || [];
      const sessionKitchenPool = sessionWaiterShifts.reduce((sum, ws) => sum + (ws.kitchen_tip || 0), 0);
      
      // Calculate total hours in this session
      const totalHours = kitchenShiftsInSession.reduce((sum, ks) => sum + (ks.hours_worked || 0), 0);
      
      if (totalHours > 0 && sessionKitchenPool > 0) {
        // Only pool participants contribute to the divisor
        const poolHours = kitchenShiftsInSession.reduce((sum, ks) => {
          return isPoolParticipant(ks.staff_name) ? sum + (ks.hours_worked || 0) : sum;
        }, 0);

        kitchenShiftsInSession.forEach(ks => {
          const staffName = ks.staff_name;
          const hours = ks.hours_worked || 0;
          const inPool = isPoolParticipant(staffName);
          const tipShare = (inPool && poolHours > 0) ? (hours / poolHours) * sessionKitchenPool : 0;
          
          if (!kitchenTipsMap[staffName]) {
            kitchenTipsMap[staffName] = { hours: 0, tip: 0 };
          }
          kitchenTipsMap[staffName].hours += hours;
          kitchenTipsMap[staffName].tip += tipShare;
        });
      } else {
        // Even if no tips, track hours
        kitchenShiftsInSession.forEach(ks => {
          const staffName = ks.staff_name;
          if (!kitchenTipsMap[staffName]) {
            kitchenTipsMap[staffName] = { hours: 0, tip: 0 };
          }
          kitchenTipsMap[staffName].hours += ks.hours_worked || 0;
        });
      }
    }

    // Convert maps to arrays sorted by tip amount
    const waiterTips: MonthlyStaffTip[] = Object.entries(waiterTipsMap)
      .map(([name, data]) => ({ name, hours: data.hours, tip: data.tip }))
      .sort((a, b) => b.tip - a.tip);

    const kitchenTips: MonthlyStaffTip[] = Object.entries(kitchenTipsMap)
      .map(([name, data]) => ({ name, hours: data.hours, tip: data.tip }))
      .sort((a, b) => b.tip - a.tip);

    // Parse month for label
    const [year, month] = monthKey.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthLabel = format(monthDate, 'MMMM yyyy', { locale: de });

    monthsData.push({
      month: monthKey,
      monthLabel,
      waiterTips,
      kitchenTips,
      totalWaiterTip: waiterTips.reduce((sum, w) => sum + w.tip, 0),
      totalKitchenTip: kitchenTips.reduce((sum, k) => sum + k.tip, 0),
      totalKitchenHours: kitchenTips.reduce((sum, k) => sum + k.hours, 0),
    });
  }

  // Sort by month descending (most recent first)
  return monthsData.sort((a, b) => b.month.localeCompare(a.month));
}

export function useMonthlyStaffTips(monthsBack: number = 12, restaurantIds?: string[] | null) {
  return useQuery({
    queryKey: ['monthly-staff-tips', monthsBack, restaurantIds],
    queryFn: () => fetchMonthlyStaffTips(monthsBack, restaurantIds || undefined),
    enabled: !!restaurantIds && restaurantIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper hook to get current month data only
export function useCurrentMonthTips(restaurantIds?: string[] | null) {
  const { data, ...rest } = useMonthlyStaffTips(1, restaurantIds);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthData = data?.find(m => m.month === currentMonth);
  
  return {
    data: currentMonthData,
    ...rest,
  };
}
