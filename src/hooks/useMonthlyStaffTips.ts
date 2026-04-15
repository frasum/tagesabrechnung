import { useQuery } from '@tanstack/react-query';
import { getAllTeamMembers, countPoolShares } from '@/lib/waiterTeamUtils';
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

function deduplicateByName(
  entries: { name: string; tip: number; hours: number }[],
  staffNames: Record<string, string>
): { name: string; tip: number; hours: number }[] {
  const merged: Record<string, { name: string; tip: number; hours: number }> = {};
  for (const entry of entries) {
    const key = entry.name.toLowerCase().trim();
    if (!merged[key]) {
      merged[key] = { name: staffNames[key] || entry.name, tip: 0, hours: 0 };
    }
    merged[key].tip += entry.tip;
    merged[key].hours += entry.hours;
  }
  return Object.values(merged).sort((a, b) => b.tip - a.tip);
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
      .select('id, name, participates_in_pool'),
  ]);

  if (waiterShiftsResult.error) throw waiterShiftsResult.error;
  if (kitchenShiftsResult.error) throw kitchenShiftsResult.error;

  const waiterShifts = waiterShiftsResult.data || [];
  const kitchenShifts = kitchenShiftsResult.data || [];

  // Build pool participation lookup, name→id mapping, and canonical name map
  const poolStatusMap: Record<string, boolean> = {};
  const nameToStaffId: Record<string, string> = {};
  const canonicalNames: Record<string, string> = {}; // normalized → display name from staff table
  if (staffResult.data) {
    for (const s of staffResult.data) {
      poolStatusMap[s.name] = s.participates_in_pool;
      const normalized = s.name.toLowerCase().trim();
      nameToStaffId[normalized] = s.id;
      canonicalNames[normalized] = s.name;
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
    const waiterTipsMap: Record<string, { tip: number; hours: number; displayName: string }> = {};
    const waiterKey = (ws: { staff_id?: string | null; waiter_name: string }) =>
      ws.staff_id || nameToStaffId[ws.waiter_name.toLowerCase().trim()] || ws.waiter_name.toLowerCase().trim();
    
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
        const expected = (s.kassiert_brutto || 0) + (s.hilf_mahl || 0) - (s.open_invoices || 0) - (s.card_total || 0);
        return sum + ((s.cash_handed_in || 0) - expected - (s.kitchen_tip || 0));
      }, 0);
      
      // Count waiter shares (team shifts include second + additional waiters, only if participates_in_pool)
      const waiterShareCount = countPoolShares(shiftsInSession.map(s => ({
        waiter_name: s.waiter_name,
        second_waiter_name: (s as any).second_waiter_name,
        additional_waiters: (s as any).additional_waiters || [],
        participates_in_pool: s.participates_in_pool,
      })));
      
      if (waiterShareCount > 0) {
        const tipPerWaiter = sessionPool / waiterShareCount;
        shiftsInSession.forEach(ws => {
          // Skip waiters who don't participate in pool
          if (!ws.participates_in_pool) return;
          
          const waiterHours = ws.hours_worked || 0;
          
          // Primary waiter
          const wKey = waiterKey(ws);
          if (!waiterTipsMap[wKey]) {
            waiterTipsMap[wKey] = { tip: 0, hours: 0, displayName: ws.waiter_name };
          }
          waiterTipsMap[wKey].tip += tipPerWaiter;
          waiterTipsMap[wKey].hours += waiterHours;
          
          // Second + additional waiters (no hours tracked for them, but merge into same entry via staff_id)
          const extraMembers = getAllTeamMembers({
            waiter_name: ws.waiter_name,
            second_waiter_name: (ws as any).second_waiter_name,
            additional_waiters: (ws as any).additional_waiters || [],
          }).slice(1); // skip primary, already handled above
          for (const name of extraMembers) {
            const normalizedName = name.toLowerCase().trim();
            const aKey = nameToStaffId[normalizedName] || normalizedName;
            if (!waiterTipsMap[aKey]) {
              waiterTipsMap[aKey] = { tip: 0, hours: 0, displayName: name };
            }
          waiterTipsMap[aKey].tip += tipPerWaiter;
          waiterTipsMap[aKey].hours += waiterHours;
        }
        });
      }
    }

    // Calculate kitchen tips proportionally by hours
    const kitchenTipsMap: Record<string, { hours: number; tip: number; displayName: string }> = {};
    const kitchenKey = (ks: { staff_id?: string | null; staff_name: string }) =>
      ks.staff_id || nameToStaffId[ks.staff_name.toLowerCase().trim()] || ks.staff_name.toLowerCase().trim();
    
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
          const kKey = kitchenKey(ks);
          const hours = ks.hours_worked || 0;
          const inPool = isPoolParticipant(ks.staff_name);
          const tipShare = (inPool && poolHours > 0) ? (hours / poolHours) * sessionKitchenPool : 0;
          
          if (!kitchenTipsMap[kKey]) {
            kitchenTipsMap[kKey] = { hours: 0, tip: 0, displayName: ks.staff_name };
          }
          kitchenTipsMap[kKey].hours += hours;
          kitchenTipsMap[kKey].tip += tipShare;
        });
      } else {
        // Even if no tips, track hours
        kitchenShiftsInSession.forEach(ks => {
          const kKey = kitchenKey(ks);
          if (!kitchenTipsMap[kKey]) {
            kitchenTipsMap[kKey] = { hours: 0, tip: 0, displayName: ks.staff_name };
          }
          kitchenTipsMap[kKey].hours += ks.hours_worked || 0;
        });
      }
    }

    // Convert maps to arrays sorted by tip amount
    const waiterTipsRaw: MonthlyStaffTip[] = Object.entries(waiterTipsMap)
      .map(([_, data]) => ({ name: data.displayName, hours: data.hours, tip: data.tip }));

    const kitchenTipsRaw: MonthlyStaffTip[] = Object.entries(kitchenTipsMap)
      .map(([_, data]) => ({ name: data.displayName, hours: data.hours, tip: data.tip }));

    // Deduplicate by normalized name (handles casing variants like "Pongsri" vs "PONGSRI")
    const waiterTips = deduplicateByName(waiterTipsRaw, canonicalNames);
    const kitchenTips = deduplicateByName(kitchenTipsRaw, canonicalNames);

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
