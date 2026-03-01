import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RestaurantEmployee = {
  id: string;
  name: string;
  perso_nr: number | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  department: string;
};

export function useRestaurantEmployees(restaurantId: string) {
  return useQuery({
    queryKey: ["restaurant-employees", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)")
        .eq("restaurant_id", restaurantId)
        .not("zt_department", "is", null);
      if (error) throw error;

      // Deduplicate by staff id (multiple rows possible for multiple departments)
      const seen = new Map<string, RestaurantEmployee>();
      for (const row of data as any[]) {
        const existing = seen.get(row.staff.id);
        if (!existing) {
          seen.set(row.staff.id, {
            id: row.staff.id,
            name: row.staff.name,
            perso_nr: row.staff.perso_nr,
            first_name: row.staff.first_name,
            last_name: row.staff.last_name,
            nickname: row.staff.nickname,
            department: row.zt_department,
          });
        }
      }
      return Array.from(seen.values());
    },
    enabled: !!restaurantId,
  });
}
