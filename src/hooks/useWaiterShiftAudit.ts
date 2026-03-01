import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAuditLog } from './useAuditLogs';
import { useAuth } from '@/contexts/AuthContext';
import type { WaiterShift } from '@/types/database';
import type { Json } from '@/integrations/supabase/types';
import { syncWaiterShiftToZt } from '@/lib/syncWaiterToZt';

type UpdateWaiterShiftParams = {
  id: string;
  sessionId: string;
  restaurantId: string;
} & Partial<Omit<WaiterShift, 'id' | 'differenz' | 'kitchen_tip' | 'created_at' | 'submitted_at'>>;

/**
 * Enhanced version of useUpdateWaiterShift that automatically creates audit logs
 * when a waiter shift is modified.
 */
export function useUpdateWaiterShiftWithAudit() {
  const queryClient = useQueryClient();
  const createAuditLog = useCreateAuditLog();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, sessionId, restaurantId, ...updates }: UpdateWaiterShiftParams) => {
      // 1. Fetch the old values first
      const { data: oldData, error: fetchError } = await supabase
        .from('waiter_shifts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. Normalize "none" value to null for second_waiter_name
      const now = new Date();
      const shiftEnd = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Berlin' });
      const shiftStart = (updates as any).shift_start || oldData.shift_start || '16:00';
      const [sh, sm] = shiftStart.split(':').map(Number);
      const [eh, em] = shiftEnd.split(':').map(Number);
      let hoursWorked = (eh * 60 + em - (sh * 60 + sm)) / 60;
      if (hoursWorked < 0) hoursWorked += 24;
      const normalizedUpdates: Record<string, unknown> = {
        ...updates,
        second_waiter_name: updates.second_waiter_name === 'none' ? null : updates.second_waiter_name,
        additional_waiters: (updates as any).additional_waiters || [],
        submitted_at: now.toISOString(),
        shift_end: shiftEnd,
        hours_worked: Math.round(hoursWorked * 100) / 100,
      };
      
      // Only include participates_in_pool if provided
      if (updates.participates_in_pool !== undefined) {
        normalizedUpdates.participates_in_pool = updates.participates_in_pool;
      }
      
      // 3. Perform the update
      const { data: newData, error: updateError } = await supabase
        .from('waiter_shifts')
        .update(normalizedUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      return { 
        oldData, 
        newData, 
        sessionId,
        restaurantId,
      };
    },
    onSuccess: async ({ oldData, newData, sessionId, restaurantId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['waiter-shifts', sessionId] });
      
      // Create audit log entry
      try {
        await createAuditLog.mutateAsync({
          table_name: 'waiter_shifts',
          record_id: newData.id,
          action: 'update',
          changed_by_id: user?.id || null,
          changed_by_name: user?.name || 'Unbekannt',
          old_values: oldData as unknown as Json,
          new_values: newData as unknown as Json,
          restaurant_id: restaurantId,
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      // Sync to Zeiterfassung
      const { data: session } = await supabase
        .from('sessions')
        .select('session_date')
        .eq('id', sessionId)
        .single();
      if (session) {
        syncWaiterShiftToZt({
          waiterName: newData.waiter_name,
          additionalWaiters: newData.additional_waiters || [],
          sessionDate: session.session_date,
          shiftStart: newData.shift_start || '16:00',
          shiftEnd: newData.shift_end || '22:00',
          restaurantId,
        });
      }
    },
  });
}
