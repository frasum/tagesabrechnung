import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StaffRole = 'waiter' | 'kitchen' | 'both';

export interface StaffRestaurant {
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface LinkedProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export type PermissionLevel = 'staff' | 'manager' | 'admin';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  hourly_rate: number | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  staff_restaurants?: StaffRestaurant[];
  /** All linked OAuth profiles for this staff member */
  linked_profiles?: LinkedProfile[];
  /** @deprecated Use linked_profiles instead - kept for backward compatibility */
  linked_profile?: LinkedProfile | null;
  /** Permission level from user_roles table */
  permission_level?: PermissionLevel;
}

export interface StaffInput {
  name: string;
  role: StaffRole;
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
      // Query staff table (without profile join due to RLS restrictions)
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
        query = query.in('role', role === 'waiter' || role === 'kitchen' ? [role, 'both'] : [role]);
      }

      const { data: staffData, error } = await query;
      if (error) throw error;
      
      // Fetch linked profiles via edge function (bypasses RLS)
      // This returns ALL linked profiles indexed by staff_id
      let linkedProfilesMap: Record<string, LinkedProfile[]> = {};
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-link-account?action=get-all-linked`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        if (response.ok) {
          const profiles = await response.json();
          // Group by staff_id for quick lookup
          for (const p of profiles) {
            if (p.staff_id) {
              if (!linkedProfilesMap[p.staff_id]) {
                linkedProfilesMap[p.staff_id] = [];
              }
              linkedProfilesMap[p.staff_id].push({
                id: p.id,
                user_id: p.user_id,
                email: p.email,
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch linked profiles:', e);
      }
      
      // Fetch user roles for all staff
      let rolesMap: Record<string, PermissionLevel> = {};
      try {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('staff_id, permission_level');
        if (rolesData) {
          for (const r of rolesData) {
            rolesMap[r.staff_id] = r.permission_level as PermissionLevel;
          }
        }
      } catch (e) {
        console.error('Failed to fetch user roles:', e);
      }

      // Merge linked_profiles and permission_level into staff data
      return (staffData || []).map((staff: any) => {
        const profiles = linkedProfilesMap[staff.id] || [];
        return {
          ...staff,
          linked_profiles: profiles,
          linked_profile: profiles.length > 0 ? profiles[0] : null,
          permission_level: rolesMap[staff.id] || 'staff',
        };
      }) as Staff[];
    },
  });
}

export function useActiveStaff(role?: StaffRole) {
  return useQuery({
    queryKey: ['staff', 'active', role],
    queryFn: async () => {
      // Query staff table directly (pin_code has been moved to separate protected table)
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
        query = query.in('role', role === 'waiter' || role === 'kitchen' ? [role, 'both'] : [role]);
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
      
      // Query staff table directly (pin_code has been moved to separate protected table)
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
        query = query.in('role', role === 'waiter' || role === 'kitchen' ? [role, 'both'] : [role]);
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
      const { restaurant_ids, pin_code, ...staffData } = input;
      
      // Check for duplicate staff name
      const { data: duplicateCheck, error: checkError } = await supabase
        .rpc('check_duplicate_staff_name', { p_name: input.name });
      
      if (checkError) throw checkError;
      if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].exists) {
        throw new Error(duplicateCheck[0].error_message || 'Ein Mitarbeiter mit diesem Namen existiert bereits.');
      }
      
      // Create the staff member (without pin_code, which is in separate table)
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
      
      // Save PIN code via secure edge function
      if (pin_code && pin_code.length === 4) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-pin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              staff_id: staff.id,
              pin_code: pin_code,
            }),
          }
        );
        if (!response.ok) {
          console.error('Failed to set PIN code');
        }
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
    mutationFn: async ({ id, restaurant_ids, pin_code, ...staffData }: Partial<StaffInput> & { id: string }) => {
      // Check for duplicate staff name if name is being changed
      if (staffData.name) {
        const { data: duplicateCheck, error: checkError } = await supabase
          .rpc('check_duplicate_staff_name', { p_name: staffData.name, p_exclude_id: id });
        
        if (checkError) throw checkError;
        if (duplicateCheck && duplicateCheck.length > 0 && duplicateCheck[0].exists) {
          throw new Error(duplicateCheck[0].error_message || 'Ein Mitarbeiter mit diesem Namen existiert bereits.');
        }
      }
      
      // Update the staff member (without pin_code, which is in separate table)
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
      
      // Update PIN code via secure edge function if provided
      if (pin_code && pin_code.length === 4) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-pin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              staff_id: id,
              pin_code: pin_code,
            }),
          }
        );
        if (!response.ok) {
          console.error('Failed to update PIN code');
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
