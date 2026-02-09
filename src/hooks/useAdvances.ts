import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Advance {
  id: string;
  session_id: string;
  staff_name: string;
  amount: number;
  created_at: string;
}

export function useAdvances(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['advances', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Advance[];
    },
    enabled: !!sessionId,
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (advance: { session_id: string; staff_name: string; amount: number }) => {
      const { data, error } = await supabase
        .from('advances')
        .insert(advance)
        .select()
        .single();
      if (error) throw error;
      return data as Advance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['advances', data.session_id] });
    },
  });
}

export function useDeleteAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['advances', sessionId] });
    },
  });
}
