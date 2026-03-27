import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContext } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';

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

export function useShiftAssignments(department: 'kitchen' | 'service', startDate: string, endDate: string, restaurantIdOverride?: string) {
  const ctx = useContext(RestaurantContext);
  const restaurantId = restaurantIdOverride || ctx?.restaurantId || '';

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
      queryClient.invalidateQueries({ queryKey: ['conflicting_shifts'] });
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
      queryClient.invalidateQueries({ queryKey: ['conflicting_shifts'] });
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

export function useConflictingShifts(restaurantId: string, department: string, staffIds: string[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['conflicting_shifts', restaurantId, department, staffIds, startDate, endDate],
    queryFn: async () => {
      if (staffIds.length === 0) return new Map<string, string>();

      // Query 1: other restaurants (existing logic)
      const { data: crossRestaurant, error: err1 } = await supabase
        .from('shift_assignments')
        .select('staff_id, shift_date, restaurants(name)')
        .in('staff_id', staffIds)
        .neq('restaurant_id', restaurantId)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate);
      if (err1) throw err1;

      // Query 2: same restaurant, different department
      const { data: crossDepartment, error: err2 } = await supabase
        .from('shift_assignments')
        .select('staff_id, shift_date, department')
        .in('staff_id', staffIds)
        .eq('restaurant_id', restaurantId)
        .neq('department', department)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate);
      if (err2) throw err2;

      const map = new Map<string, string>();
      for (const row of crossRestaurant || []) {
        const r = row.restaurants as unknown as { name: string } | null;
        if (r?.name) {
          map.set(`${row.staff_id}-${row.shift_date}`, r.name);
        }
      }
      for (const row of crossDepartment || []) {
        const key = `${row.staff_id}-${row.shift_date}`;
        if (!map.has(key)) {
          const label = row.department === 'kitchen' ? 'Küche' : 'Service';
          map.set(key, label);
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
      queryClient.invalidateQueries({ queryKey: ['conflicting_shifts'] });
    },
  });
}
