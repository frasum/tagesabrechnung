import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Priority = 'green' | 'yellow' | 'red';

export interface ChecklistPriorityRow {
  id: string;
  category: string;
  feature_key: string;
  priority: Priority | null;
  is_worked_on: boolean;
  notes: string | null;
  updated_at: string;
}

export interface ChecklistEdgeFunction {
  id: string;
  function_name: string;
  label: string;
}

export function useChecklistPriorities() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('checklist_priorities_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_priorities' },
        () => qc.invalidateQueries({ queryKey: ['checklist-priorities'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ['checklist-priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_priorities')
        .select('*');
      if (error) throw error;
      return (data ?? []) as ChecklistPriorityRow[];
    },
  });
}

export function useChecklistEdgeFunctions() {
  return useQuery({
    queryKey: ['checklist-edge-functions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_edge_functions')
        .select('*')
        .order('function_name');
      if (error) throw error;
      return (data ?? []) as ChecklistEdgeFunction[];
    },
  });
}

export function useChecklistSettings() {
  return useQuery({
    queryKey: ['checklist-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: number; notes: string | null; updated_at: string } | null;
    },
  });
}

export function useUpsertPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      feature_key: string;
      priority: Priority | null;
    }) => {
      const { error } = await supabase
        .from('checklist_priorities')
        .upsert(
          {
            category: input.category,
            feature_key: input.feature_key,
            priority: input.priority,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'category,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-priorities'] }),
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useToggleWorkedOn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      feature_key: string;
      is_worked_on: boolean;
    }) => {
      const { error } = await supabase
        .from('checklist_priorities')
        .upsert(
          {
            category: input.category,
            feature_key: input.feature_key,
            is_worked_on: input.is_worked_on,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'category,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-priorities'] }),
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useUpdateFeatureNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      feature_key: string;
      notes: string;
    }) => {
      const { error } = await supabase
        .from('checklist_priorities')
        .upsert(
          {
            category: input.category,
            feature_key: input.feature_key,
            notes: input.notes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'category,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-priorities'] }),
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useBulkSetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      feature_keys: string[];
      priority: Priority;
    }) => {
      const rows = input.feature_keys.map((k) => ({
        category: input.category,
        feature_key: k,
        priority: input.priority,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('checklist_priorities')
        .upsert(rows, { onConflict: 'category,feature_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-priorities'] });
      toast.success('Kategorie aktualisiert');
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useUpdateGlobalNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from('checklist_settings')
        .upsert({ id: 1, notes, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist-settings'] }),
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useAddEdgeFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { function_name: string; label: string }) => {
      const { error } = await supabase
        .from('checklist_edge_functions')
        .insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-edge-functions'] });
      toast.success('Function hinzugefügt');
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}
