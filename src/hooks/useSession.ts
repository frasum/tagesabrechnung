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
    mutationFn: async (shift: Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('waiter_shifts')
        .insert(shift)
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
    mutationFn: async ({ id, sessionId, ...updates }: { id: string; sessionId: string } & Partial<Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at'>>) => {
      const { data, error } = await supabase
        .from('waiter_shifts')
        .update(updates)
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
