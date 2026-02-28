import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ZtEmployee = {
  id: string;
  perso_nr: number;
  name: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  department: string;
};

/**
 * Fetches staff members assigned to a specific restaurant that have zt_department set.
 * Uses the merged staff + staff_restaurants tables.
 */
export function useZtEmployees(restaurantId: string) {
  return useQuery({
    queryKey: ["zt-employees", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, staff!inner(id, perso_nr, name, first_name, last_name, nickname, is_active)")
        .eq("restaurant_id", restaurantId)
        .not("zt_department", "is", null);
      if (error) throw error;

      return (data as any[])
        .filter((row: any) => row.staff?.is_active !== false)
        .map((row: any) => ({
          id: row.staff.id,
          perso_nr: row.staff.perso_nr ?? 0,
          name: row.staff.name ?? "",
          first_name: row.staff.first_name ?? "",
          last_name: row.staff.last_name ?? "",
          nickname: row.staff.nickname,
          department: row.zt_department,
        })) as ZtEmployee[];
    },
    enabled: !!restaurantId,
  });
}
