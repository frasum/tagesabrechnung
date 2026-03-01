import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Session, WaiterShift, CardTransaction, KitchenShift, Expense } from '@/types/database';

export function useSession(date: Date, restaurantId: string | null) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['session', dateStr, restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_date', dateStr)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Session | null;
    },
    enabled: !!restaurantId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ date, restaurantId, createdByName }: { date: Date; restaurantId: string; createdByName?: string }) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Check if session already exists (prevents duplicate key error)
      const { data: existing } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_date', dateStr)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (existing) return existing as Session;

      const { data, error } = await supabase
        .from('sessions')
        .insert({ session_date: dateStr, restaurant_id: restaurantId, created_by_name: createdByName, updated_by_name: createdByName })
        .select()
        .single();
      
      if (error) throw error;
      return data as Session;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session', data.session_date, data.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
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
      queryClient.invalidateQueries({ queryKey: ['session', data.session_date, data.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

export function useWaiterShifts(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`waiter-shifts-realtime-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_shifts',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['waiter-shifts', sessionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

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
    mutationFn: async (shift: Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at' | 'submitted_at' | 'shift_start' | 'shift_end' | 'hours_worked'> & { shift_start?: string }) => {
      // Normalize "none" value to null for second_waiter_name
      const now = new Date();
      const shiftEnd = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Berlin' });
      const shiftStart = shift.shift_start || '16:00';
      // Calculate hours worked from shift_start and shift_end
      const [sh, sm] = shiftStart.split(':').map(Number);
      const [eh, em] = shiftEnd.split(':').map(Number);
      let hoursWorked = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (hoursWorked < 0) hoursWorked += 24;
      const normalizedShift = {
        ...shift,
        second_waiter_name: shift.second_waiter_name === 'none' ? null : shift.second_waiter_name,
        participates_in_pool: shift.participates_in_pool ?? true,
        submitted_at: now.toISOString(),
        shift_start: shiftStart,
        shift_end: shiftEnd,
        hours_worked: Math.round(hoursWorked * 100) / 100,
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
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
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
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

export function useUpdateWaiterShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId, ...updates }: { id: string; sessionId: string } & Partial<Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at' | 'submitted_at'>>) => {
      // Normalize "none" value to null for second_waiter_name
      const now = new Date();
      const shiftEnd = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Berlin' });
      const shiftStart = (updates as any).shift_start || '16:00';
      const [sh, sm] = shiftStart.split(':').map(Number);
      const [eh, em] = shiftEnd.split(':').map(Number);
      let hoursWorked = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (hoursWorked < 0) hoursWorked += 24;
      const normalizedUpdates: Record<string, unknown> = {
        ...updates,
        second_waiter_name: updates.second_waiter_name === 'none' ? null : updates.second_waiter_name,
        submitted_at: now.toISOString(),
        shift_end: shiftEnd,
        hours_worked: Math.round(hoursWorked * 100) / 100,
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
      queryClient.invalidateQueries({ queryKey: ['waiter-shifts', data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
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
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
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
      queryClient.invalidateQueries({ queryKey: ['previous-day-deficit'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    },
  });
}

export function useSessionHistory(restaurantId: string | null, page = 0) {
  const PAGE_SIZE = 30;
  return useQuery({
    queryKey: ['session-history', restaurantId, page],
    queryFn: async () => {
      if (!restaurantId) return { sessions: [] as Session[], totalCount: 0 };
      
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from('sessions')
        .select('*', { count: 'exact' })
        .eq('restaurant_id', restaurantId)
        .order('session_date', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { sessions: (data ?? []) as Session[], totalCount: count ?? 0 };
    },
    enabled: !!restaurantId,
  });
}

export interface WaiterTipAverage {
  totalPoolShare: number;
  totalSales: number;
  shiftsCount: number;
  avgTipPercent: number;
}

export function useWaiterTipAverages(restaurantId: string | null) {
  return useQuery({
    queryKey: ['waiter-tip-averages', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return {};
      
      // 1. Load all sessions for this restaurant with their shifts
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .order('session_date', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return {};

      const sessionIds = sessions.map(s => s.id);

      // 2. Load all waiter shifts for these sessions
      const { data: allShifts, error: shiftsError } = await supabase
        .from('waiter_shifts')
        .select('*')
        .in('session_id', sessionIds);
      
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

        // Calculate tip per shift (total tip before kitchen deduction)
        // For team shifts, both waiters get the same full tip % value

        for (const shift of sessionShifts) {
          // Skip waiters who don't participate in pool
          if (!shift.participates_in_pool) continue;

          const posSales = shift.pos_sales || 0;
          const expected = (shift.pos_sales || 0) + (shift.hilf_mahl || 0) - (shift.open_invoices || 0) - (shift.card_total || 0);
          const totalTip = (shift.cash_handed_in || 0) - expected; // before kitchen deduction
          
          // Primary waiter
          const name = shift.waiter_name;
          if (!waiterAverages[name]) {
            waiterAverages[name] = { totalPoolShare: 0, totalSales: 0, shiftsCount: 0 };
          }
          waiterAverages[name].totalPoolShare += totalTip;
          waiterAverages[name].totalSales += posSales;
          waiterAverages[name].shiftsCount += 1;

          // Second waiter (if exists) — gets the same full shift values
          if (shift.second_waiter_name) {
            const secondName = shift.second_waiter_name;
            if (!waiterAverages[secondName]) {
              waiterAverages[secondName] = { totalPoolShare: 0, totalSales: 0, shiftsCount: 0 };
            }
            waiterAverages[secondName].totalPoolShare += totalTip;
            waiterAverages[secondName].totalSales += posSales;
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
    enabled: !!restaurantId,
  });
}

export function useDeleteAllSessions(restaurantId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurant ID required');
      
      // Get all session IDs for this restaurant first
      const { data: sessions, error: sessionsQueryError } = await supabase
        .from('sessions')
        .select('id')
        .eq('restaurant_id', restaurantId);
      
      if (sessionsQueryError) throw sessionsQueryError;
      if (!sessions || sessions.length === 0) return;
      
      const sessionIds = sessions.map(s => s.id);
      
      // Delete all dependent tables first (order matters due to foreign keys)
      // Get waiter shift IDs first for card_transactions
      const { data: waiterShifts } = await supabase
        .from('waiter_shifts')
        .select('id')
        .in('session_id', sessionIds);
      
      if (waiterShifts && waiterShifts.length > 0) {
        const waiterShiftIds = waiterShifts.map(ws => ws.id);
        const { error: cardError } = await supabase
          .from('card_transactions')
          .delete()
          .in('waiter_shift_id', waiterShiftIds);
        if (cardError) throw cardError;
      }
      
      const { error: expenseError } = await supabase
        .from('expenses')
        .delete()
        .in('session_id', sessionIds);
      if (expenseError) throw expenseError;
      
      const { error: kitchenError } = await supabase
        .from('kitchen_shifts')
        .delete()
        .in('session_id', sessionIds);
      if (kitchenError) throw kitchenError;
      
      const { error: waiterError } = await supabase
        .from('waiter_shifts')
        .delete()
        .in('session_id', sessionIds);
      if (waiterError) throw waiterError;
      
      // Finally delete all sessions for this restaurant
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-history', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
