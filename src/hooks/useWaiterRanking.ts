import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WaiterShift, Session } from '@/types/database';

export interface WaiterRankingItem {
  name: string;
  avgTipPercent: number;
  shiftsCount: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
  rank: number;
}

export function useWaiterRanking() {
  return useQuery({
    queryKey: ['waiter-ranking'],
    queryFn: async (): Promise<WaiterRankingItem[]> => {
      // 1. Load staff for canonical names and id mapping
      const [sessionsResult, shiftsResult, staffResult] = await Promise.all([
        supabase.from('sessions').select('id, session_date').order('session_date', { ascending: false }),
        supabase.from('waiter_shifts').select('session_id, waiter_name, staff_id, pos_sales, hilf_mahl, open_invoices, card_total, cash_handed_in, kitchen_tip, participates_in_pool'),
        supabase.from('staff').select('id, name'),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (shiftsResult.error) throw shiftsResult.error;

      const sessions = sessionsResult.data;
      const allShifts = shiftsResult.data;
      if (!sessions?.length || !allShifts?.length) return [];

      // Build canonical name and id maps
      const nameToStaffId: Record<string, string> = {};
      const canonicalNames: Record<string, string> = {};
      if (staffResult.data) {
        for (const s of staffResult.data) {
          const normalized = s.name.toLowerCase().trim();
          nameToStaffId[normalized] = s.id;
          canonicalNames[normalized] = s.name;
        }
      }

      const waiterKey = (shift: { staff_id?: string | null; waiter_name: string }) =>
        shift.staff_id || nameToStaffId[shift.waiter_name.toLowerCase().trim()] || shift.waiter_name.toLowerCase().trim();

      // 2. Group shifts by session
      const shiftsBySession: Record<string, typeof allShifts> = {};
      for (const shift of allShifts) {
        if (!shiftsBySession[shift.session_id]) shiftsBySession[shift.session_id] = [];
        shiftsBySession[shift.session_id].push(shift);
      }

      // 3. Session order map
      const sessionOrder = new Map<string, number>();
      sessions.forEach((s, idx) => sessionOrder.set(s.id, idx));

      // 4. Calculate tip percent per waiter per session
      type WaiterSessionData = { tipPercent: number; sessionOrder: number };
      const waiterData: Record<string, { displayName: string; sessions: WaiterSessionData[] }> = {};

      for (const sessionId of Object.keys(shiftsBySession)) {
        const sessionShifts = shiftsBySession[sessionId];
        if (!sessionShifts.length) continue;
        const order = sessionOrder.get(sessionId) ?? 999;

        for (const shift of sessionShifts) {
          const key = waiterKey(shift);
          const sales = shift.pos_sales || 0;
          const expected = (shift.pos_sales || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
          const totalTip = (shift.cash_handed_in || 0) - expected;
          const tipPercent = sales > 0 ? (totalTip / sales) * 100 : 0;

          if (!waiterData[key]) {
            const normalized = shift.waiter_name.toLowerCase().trim();
            waiterData[key] = { displayName: canonicalNames[normalized] || shift.waiter_name, sessions: [] };
          }
          waiterData[key].sessions.push({ tipPercent, sessionOrder: order });
        }
      }

      // 6. Calculate averages and trends
      const rankings: Omit<WaiterRankingItem, 'rank'>[] = [];

      for (const [key, entry] of Object.entries(waiterData)) {
        const sessionData = entry.sessions;
        // Sort by session order (most recent first)
        sessionData.sort((a, b) => a.sessionOrder - b.sessionOrder);

        const shiftsCount = sessionData.length;
        const avgTipPercent = sessionData.reduce((sum, d) => sum + d.tipPercent, 0) / shiftsCount;

        // Calculate trend (compare recent vs older sessions)
        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        let trendValue = 0;

        if (shiftsCount >= 2) {
          const midpoint = Math.ceil(shiftsCount / 2);
          const recentSessions = sessionData.slice(0, midpoint);
          const olderSessions = sessionData.slice(midpoint);

          if (olderSessions.length > 0) {
            const recentAvg = recentSessions.reduce((s, d) => s + d.tipPercent, 0) / recentSessions.length;
            const olderAvg = olderSessions.reduce((s, d) => s + d.tipPercent, 0) / olderSessions.length;
            trendValue = recentAvg - olderAvg;

            if (trendValue > 0.1) trend = 'up';
            else if (trendValue < -0.1) trend = 'down';
          }
        }

        rankings.push({
          name: entry.displayName,
          avgTipPercent,
          shiftsCount,
          trend,
          trendValue: Math.abs(trendValue),
        });
      }

      // 7. Sort by avgTipPercent and assign ranks
      rankings.sort((a, b) => b.avgTipPercent - a.avgTipPercent);
      
      return rankings.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    },
  });
}
