import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AuditLog } from '@/types/database';
import type { Json } from '@/integrations/supabase/types';

export interface CreateAuditLogParams {
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  changed_by_id: string | null;
  changed_by_name: string;
  old_values: Json | null;
  new_values: Json | null;
  restaurant_id: string;
}

export function useAuditLogs(restaurantId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['audit-logs', restaurantId, limit],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!restaurantId,
  });
}

export function useAuditLogsForRecord(tableName: string, recordId: string | undefined) {
  return useQuery({
    queryKey: ['audit-logs', tableName, recordId],
    queryFn: async () => {
      if (!recordId) return [];
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!recordId,
  });
}

export function useCreateAuditLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateAuditLogParams) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          table_name: params.table_name,
          record_id: params.record_id,
          action: params.action,
          changed_by_id: params.changed_by_id,
          changed_by_name: params.changed_by_name,
          old_values: params.old_values,
          new_values: params.new_values,
          restaurant_id: params.restaurant_id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as AuditLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs', data.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs', data.table_name, data.record_id] });
    },
  });
}

// Helper function to get changed fields between old and new values
export function getChangedFields(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  if (!oldValues || !newValues) return [];
  
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  
  // Fields to track (human-readable names will be added in UI)
  const trackedFields = [
    'pos_sales',
    'kassiert_brutto',
    'card_total',
    'hilf_mahl',
    'open_invoices',
    'cash_handed_in',
    'kitchen_tip',
    'waiter_name',
    'second_waiter_name',
    'participates_in_pool',
  ];
  
  for (const field of trackedFields) {
    const oldVal = oldValues[field];
    const newVal = newValues[field];
    
    // Compare values (handle null/undefined)
    if (oldVal !== newVal && !(oldVal == null && newVal == null)) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }
  
  return changes;
}

// Human-readable field names
export const fieldLabels: Record<string, string> = {
  pos_sales: 'POS Umsatz',
  kassiert_brutto: 'Kassiert Brutto',
  card_total: 'Kartenzahlung',
  hilf_mahl: 'Hilf Mahlzeiten',
  open_invoices: 'Offene Rechnungen',
  cash_handed_in: 'Bargeld abgegeben',
  kitchen_tip: 'Küchen-Trinkgeld',
  waiter_name: 'Mitarbeiter',
  second_waiter_name: 'Zweiter Mitarbeiter',
  participates_in_pool: 'Pool-Teilnahme',
};
