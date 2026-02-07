import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Session, WaiterShift, CardTransaction, KitchenShift, Expense } from '@/types/database';

export function useSession(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['session', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_date', dateStr)
        .maybeSingle();
      
      if (error) throw error;
      return data as Session | null;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('sessions')
        .insert({ session_date: dateStr })
        .select()
        .single();
      
      if (error) throw error;
      return data as Session;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session', data.session_date] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Session> & { id: string }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Session;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session', data.session_date] });
    },
  });
}

export function useWaiterShifts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['waiter-shifts', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('waiter_shifts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as WaiterShift[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateWaiterShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shift: Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at' | 'submitted_at'>) => {
      // Normalize "none" value to null for second_waiter_name
      const normalizedShift = {
        ...shift,
        second_waiter_name: shift.second_waiter_name === 'none' ? null : shift.second_waiter_name,
        participates_in_pool: shift.participates_in_pool ?? true,
        submitted_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('waiter_shifts')
        .insert(normalizedShift)
        .select()
        .single();
      
      if (error) throw error;
      return data as WaiterShift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waiter-shifts', data.session_id] });
    },
  });
}

export function useDeleteWaiterShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase
        .from('waiter_shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['waiter-shifts', sessionId] });
    },
  });
}

export function useUpdateWaiterShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId, ...updates }: { id: string; sessionId: string } & Partial<Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at' | 'submitted_at'>>) => {
      // Normalize "none" value to null for second_waiter_name
      const normalizedUpdates: Record<string, unknown> = {
        ...updates,
        second_waiter_name: updates.second_waiter_name === 'none' ? null : updates.second_waiter_name,
        submitted_at: new Date().toISOString(),
      };
      // Only include participates_in_pool if provided
      if (updates.participates_in_pool !== undefined) {
        normalizedUpdates.participates_in_pool = updates.participates_in_pool;
      }
      const { data, error } = await supabase
        .from('waiter_shifts')
        .update(normalizedUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, sessionId } as WaiterShift & { sessionId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['waiter-shifts', data.sessionId] 
      });
    },
  });
}

export function useCardTransactions(waiterShiftId: string | undefined) {
  return useQuery({
    queryKey: ['card-transactions', waiterShiftId],
    queryFn: async () => {
      if (!waiterShiftId) return [];
      const { data, error } = await supabase
        .from('card_transactions')
        .select('*')
        .eq('waiter_shift_id', waiterShiftId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CardTransaction[];
    },
    enabled: !!waiterShiftId,
  });
}

export function useCreateCardTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Omit<CardTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('card_transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      return data as CardTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['card-transactions', data.waiter_shift_id] });
    },
  });
}

export function useDeleteCardTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, waiterShiftId }: { id: string; waiterShiftId: string }) => {
      const { error } = await supabase
        .from('card_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return waiterShiftId;
    },
    onSuccess: (waiterShiftId) => {
      queryClient.invalidateQueries({ queryKey: ['card-transactions', waiterShiftId] });
    },
  });
}

export function useKitchenShifts(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['kitchen-shifts', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('kitchen_shifts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as KitchenShift[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateKitchenShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shift: Omit<KitchenShift, 'id' | 'hours_worked' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('kitchen_shifts')
        .insert(shift)
        .select()
        .single();
      
      if (error) throw error;
      return data as KitchenShift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-shifts', data.session_id] });
    },
  });
}

export function useDeleteKitchenShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase
        .from('kitchen_shifts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-shifts', sessionId] });
    },
  });
}

export function useExpenses(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', data.session_id] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', sessionId] });
    },
  });
}

export function useSessionHistory() {
  return useQuery({
    queryKey: ['session-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as Session[];
    },
  });
}

export interface WaiterTipAverage {
  totalPoolShare: number;
  totalSales: number;
  shiftsCount: number;
  avgTipPercent: number;
}

export function useWaiterTipAverages() {
  return useQuery({
    queryKey: ['waiter-tip-averages'],
    queryFn: async () => {
      // 1. Load all sessions with their shifts
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .order('session_date', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return {};

      // 2. Load all waiter shifts
      const { data: allShifts, error: shiftsError } = await supabase
        .from('waiter_shifts')
        .select('*');
      
      if (shiftsError) throw shiftsError;
      if (!allShifts || allShifts.length === 0) return {};

      // 3. Group shifts by session
      const shiftsBySession: Record<string, WaiterShift[]> = {};
      for (const shift of allShifts) {
        if (!shiftsBySession[shift.session_id]) {
          shiftsBySession[shift.session_id] = [];
        }
        shiftsBySession[shift.session_id].push(shift as WaiterShift);
      }

      // 4. Calculate pool share per waiter per session
      const waiterAverages: Record<string, { totalPoolShare: number; totalSales: number; shiftsCount: number }> = {};

      for (const sessionId of Object.keys(shiftsBySession)) {
        const sessionShifts = shiftsBySession[sessionId];
        if (sessionShifts.length === 0) continue;

        // Calculate session pool (same logic as in WaiterCashUp)
        const sessionPool = sessionShifts.reduce((sum, shift) => {
          const expected = (shift.kassiert_brutto || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
          const contribution = (shift.cash_handed_in || 0) - expected - (shift.kitchen_tip || 0);
          return sum + contribution;
        }, 0);

        // Count all waiter shares (team shifts count as 2, only if participates_in_pool)
        const totalWaiterShares = sessionShifts.reduce((count, shift) => {
          if (!shift.participates_in_pool) return count;
          return count + (shift.second_waiter_name ? 2 : 1);
        }, 0);
        const sharePerWaiter = totalWaiterShares > 0 ? sessionPool / totalWaiterShares : 0;

        // Aggregate per waiter (including second waiters, only if participates_in_pool)
        for (const shift of sessionShifts) {
          // Skip waiters who don't participate in pool
          if (!shift.participates_in_pool) continue;
          
          // Primary waiter
          const name = shift.waiter_name;
          if (!waiterAverages[name]) {
            waiterAverages[name] = { totalPoolShare: 0, totalSales: 0, shiftsCount: 0 };
          }
          waiterAverages[name].totalPoolShare += sharePerWaiter;
          // For team shifts, split sales 50/50 for average calculation
          const salesShare = shift.second_waiter_name ? (shift.pos_sales || 0) / 2 : (shift.pos_sales || 0);
          waiterAverages[name].totalSales += salesShare;
          waiterAverages[name].shiftsCount += 1;

          // Second waiter (if exists)
          if (shift.second_waiter_name) {
            const secondName = shift.second_waiter_name;
            if (!waiterAverages[secondName]) {
              waiterAverages[secondName] = { totalPoolShare: 0, totalSales: 0, shiftsCount: 0 };
            }
            waiterAverages[secondName].totalPoolShare += sharePerWaiter;
            waiterAverages[secondName].totalSales += salesShare;
            waiterAverages[secondName].shiftsCount += 1;
          }
        }
      }

      // 5. Calculate average tip percent for each waiter
      const result: Record<string, WaiterTipAverage> = {};
      for (const [name, data] of Object.entries(waiterAverages)) {
        result[name] = {
          ...data,
          avgTipPercent: data.totalSales > 0 ? (data.totalPoolShare / data.totalSales) * 100 : 0,
        };
      }

      return result;
    },
  });
}
