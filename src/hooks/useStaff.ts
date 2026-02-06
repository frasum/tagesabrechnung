import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StaffRole = 'waiter' | 'kitchen';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string | null;
  hourly_rate: number | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StaffInput {
  name: string;
  role: StaffRole;
  phone?: string;
  hourly_rate?: number;
  notes?: string;
  is_active?: boolean;
  pin_code?: string;
}

export function useStaff(role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', role],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useActiveStaff(role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', 'active', role],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: StaffInput) => {
      const { data, error } = await supabase
        .from('staff')
        .insert(staff)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Mitarbeiter erfolgreich hinzugefügt');
    },
    onError: (error) => {
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
      console.error('Error creating staff:', error);
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...staff }: Partial<StaffInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff')
        .update(staff)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Mitarbeiter erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Mitarbeiters');
      console.error('Error updating staff:', error);
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Mitarbeiter erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Mitarbeiters');
      console.error('Error deleting staff:', error);
    },
  });
}
