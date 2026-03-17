import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';

export interface ShiftAssignment {
  id: string;
  staff_id: string;
  restaurant_id: string;
  department: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  assigned_skill_id: string | null;
  notes: string | null;
}

export interface Absence {
  id: string;
  staff_id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  notes: string | null;
}

export function useShiftAssignments(department: 'kitchen' | 'service', startDate: string, endDate: string) {
  const { restaurantId } = useRestaurant();

  return useQuery({
    queryKey: ['shift_assignments', restaurantId, department, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('department', department)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate);
      if (error) throw error;
      return data as ShiftAssignment[];
    },
    enabled: !!restaurantId,
  });
}

export function useUpsertShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: Omit<ShiftAssignment, 'id'> & { id?: string }) => {
      if (shift.id) {
        const { error } = await supabase
          .from('shift_assignments')
          .update({
            start_time: shift.start_time,
            end_time: shift.end_time,
            assigned_skill_id: shift.assigned_skill_id,
            notes: shift.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shift_assignments')
          .insert(shift);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useAbsences(staffIds: string[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['absences', staffIds, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .in('staff_id', staffIds)
        .lte('start_date', endDate)
        .gte('end_date', startDate);
      if (error) throw error;
      return data as Absence[];
    },
    enabled: staffIds.length > 0,
  });
}

export function useUpsertAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absence: Omit<Absence, 'id'> & { id?: string }) => {
      if (absence.id) {
        const { error } = await supabase
          .from('absences')
          .update({
            absence_type: absence.absence_type,
            start_date: absence.start_date,
            end_date: absence.end_date,
            notes: absence.notes,
          })
          .eq('id', absence.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('absences')
          .insert(absence);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });
}

export function useConflictingShifts(restaurantId: string, staffIds: string[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['conflicting_shifts', restaurantId, staffIds, startDate, endDate],
    queryFn: async () => {
      if (staffIds.length === 0) return new Map<string, string>();
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('staff_id, shift_date, restaurants(name)')
        .in('staff_id', staffIds)
        .neq('restaurant_id', restaurantId)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of data || []) {
        const r = row.restaurants as unknown as { name: string } | null;
        if (r?.name) {
          map.set(`${row.staff_id}-${row.shift_date}`, r.name);
        }
      }
      return map;
    },
    enabled: !!restaurantId && staffIds.length > 0,
  });
}

export function useBatchInsertShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shifts: Omit<ShiftAssignment, 'id'>[]) => {
      if (shifts.length === 0) return;
      const { error } = await supabase
        .from('shift_assignments')
        .insert(shifts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}
