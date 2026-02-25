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
      // 1. Load all sessions ordered by date
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, session_date')
        .order('session_date', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      // 2. Load all waiter shifts
      const { data: allShifts, error: shiftsError } = await supabase
        .from('waiter_shifts')
        .select('session_id, waiter_name, pos_sales, hilf_mahl, open_invoices, card_total, cash_handed_in, kitchen_tip, participates_in_pool');
      
      if (shiftsError) throw shiftsError;
      if (!allShifts || allShifts.length === 0) return [];

      // 3. Group shifts by session for pool calculation
      const shiftsBySession: Record<string, WaiterShift[]> = {};
      for (const shift of allShifts) {
        if (!shiftsBySession[shift.session_id]) {
          shiftsBySession[shift.session_id] = [];
        }
        shiftsBySession[shift.session_id].push(shift as WaiterShift);
      }

      // 4. Create session order map (most recent first)
      const sessionOrder = new Map<string, number>();
      sessions.forEach((s, idx) => sessionOrder.set(s.id, idx));

      // 5. Calculate tip percent for each waiter in each session
      type WaiterSessionData = {
        tipPercent: number;
        sessionOrder: number;
      };
      const waiterData: Record<string, WaiterSessionData[]> = {};

      for (const sessionId of Object.keys(shiftsBySession)) {
        const sessionShifts = shiftsBySession[sessionId];
        if (sessionShifts.length === 0) continue;

        // Calculate session pool (same logic as WaiterCashUp)
        const sessionPool = sessionShifts.reduce((sum, shift) => {
          const expected = (shift.pos_sales || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
          const contribution = (shift.cash_handed_in || 0) - expected - (shift.kitchen_tip || 0);
          return sum + contribution;
        }, 0);

        const sharePerWaiter = sessionPool / sessionShifts.length;
        const order = sessionOrder.get(sessionId) ?? 999;

        // Aggregate per waiter
        for (const shift of sessionShifts) {
          const name = shift.waiter_name;
          const sales = shift.pos_sales || 0;
          
          // Berechne Gesamt-Trinkgeld vor Küchenabzug
          const expected = (shift.pos_sales || 0) + (shift.hilf_mahl || 0) 
                           - (shift.open_invoices || 0) - (shift.card_total || 0);
          const totalTip = (shift.cash_handed_in || 0) - expected;
          
          const tipPercent = sales > 0 ? (totalTip / sales) * 100 : 0;

          if (!waiterData[name]) {
            waiterData[name] = [];
          }
          waiterData[name].push({ tipPercent, sessionOrder: order });
        }
      }

      // 6. Calculate averages and trends
      const rankings: Omit<WaiterRankingItem, 'rank'>[] = [];

      for (const [name, sessionData] of Object.entries(waiterData)) {
        // Sort by session order (most recent first)
        sessionData.sort((a, b) => a.sessionOrder - b.sessionOrder);

        const shiftsCount = sessionData.length;
        const avgTipPercent = sessionData.reduce((sum, d) => sum + d.tipPercent, 0) / shiftsCount;

        // Calculate trend (compare recent vs older sessions)
        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        let trendValue = 0;

        if (shiftsCount >= 2) {
          // Split into recent half and older half
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
          name,
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
