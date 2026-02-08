import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StaffRole = 'waiter' | 'kitchen';

export interface StaffRestaurant {
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string;
    slug: string;
  };
}

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
  staff_restaurants?: StaffRestaurant[];
}

export interface StaffInput {
  name: string;
  role: StaffRole;
  phone?: string;
  hourly_rate?: number;
  notes?: string;
  is_active?: boolean;
  pin_code?: string;
  restaurant_ids?: string[];
}

export function useStaff(role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', role],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
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
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
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

// Get active staff for a specific restaurant
export function useActiveStaffByRestaurant(restaurantId: string | null, role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', 'active', 'restaurant', restaurantId, role],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      // First get staff IDs for this restaurant
      const { data: staffRestaurants, error: srError } = await supabase
        .from('staff_restaurants')
        .select('staff_id')
        .eq('restaurant_id', restaurantId);
      
      if (srError) throw srError;
      
      const staffIds = staffRestaurants.map(sr => sr.staff_id);
      if (staffIds.length === 0) return [];
      
      let query = supabase
        .from('staff')
        .select(`
          *,
          staff_restaurants (
            restaurant_id,
            restaurants (
              id,
              name,
              slug
            )
          )
        `)
        .eq('is_active', true)
        .in('id', staffIds)
        .order('name', { ascending: true });

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StaffInput) => {
      const { restaurant_ids, ...staffData } = input;
      
      // Create the staff member
      const { data: staff, error } = await supabase
        .from('staff')
        .insert(staffData)
        .select()
        .single();
      if (error) throw error;
      
      // Add restaurant assignments if provided
      if (restaurant_ids && restaurant_ids.length > 0) {
        const { error: assignError } = await supabase
          .from('staff_restaurants')
          .insert(restaurant_ids.map(rid => ({
            staff_id: staff.id,
            restaurant_id: rid,
          })));
        if (assignError) throw assignError;
      }
      
      return staff;
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
    mutationFn: async ({ id, restaurant_ids, ...staffData }: Partial<StaffInput> & { id: string }) => {
      // Update the staff member
      const { data, error } = await supabase
        .from('staff')
        .update(staffData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Update restaurant assignments if provided
      if (restaurant_ids !== undefined) {
        // Remove all existing assignments
        const { error: deleteError } = await supabase
          .from('staff_restaurants')
          .delete()
          .eq('staff_id', id);
        if (deleteError) throw deleteError;
        
        // Add new assignments
        if (restaurant_ids.length > 0) {
          const { error: insertError } = await supabase
            .from('staff_restaurants')
            .insert(restaurant_ids.map(rid => ({
              staff_id: id,
              restaurant_id: rid,
            })));
          if (insertError) throw insertError;
        }
      }
      
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
