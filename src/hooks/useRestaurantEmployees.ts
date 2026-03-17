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
  date_of_birth: string | null;
};

export function useRestaurantEmployees(restaurantId: string) {
  return useQuery({
    queryKey: ["restaurant-employees", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname, is_active, date_of_birth)")
        .eq("restaurant_id", restaurantId)
        .not("zt_department", "is", null)
        .eq("staff.is_active", true);
      if (error) throw error;

      return (data as any[]).map((row) => ({
        id: row.staff.id,
        name: row.staff.name,
        perso_nr: row.staff.perso_nr,
        first_name: row.staff.first_name,
        last_name: row.staff.last_name,
        nickname: row.staff.nickname,
        department: row.zt_department,
        date_of_birth: row.staff.date_of_birth,
      }));
    },
    enabled: !!restaurantId,
  });
}
