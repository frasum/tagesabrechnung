import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Map<string, number> of holiday_date -> surcharge_rate
 * for use in splitting Feiertag hours into 125% and 150% categories.
 */
export function useHolidayRates() {
  return useQuery({
    queryKey: ["bavarian-holiday-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bavarian_holidays")
        .select("holiday_date, surcharge_rate");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const h of data ?? []) {
        map.set(h.holiday_date, h.surcharge_rate);
      }
      return map;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
