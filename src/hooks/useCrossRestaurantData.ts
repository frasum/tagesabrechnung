import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ZtEmployee } from "./useZtEmployees";

/**
 * Given a selected period and restaurant, loads:
 * - All matching periods (same start_date/end_date across all restaurants)
 * - All weeks from those periods
 * - All shifts from those weeks
 * - All employees with department from staff_restaurants
 */
export function useCrossRestaurantData(
  selectedPeriodId: string,
  selectedRestaurantId: string,
  filterRestaurantId?: string
) {
  // 1. Load the selected period to get its date range
  const { data: selectedPeriod } = useQuery({
    queryKey: ["period-detail", selectedPeriodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduling_periods")
        .select("*")
        .eq("id", selectedPeriodId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriodId,
  });

  // 2. Find all matching periods with same date range
  const { data: matchingPeriods } = useQuery({
    queryKey: ["matching-periods", selectedPeriod?.start_date, selectedPeriod?.end_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduling_periods")
        .select("*")
        .eq("start_date", selectedPeriod!.start_date)
        .eq("end_date", selectedPeriod!.end_date);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod,
  });

  const allPeriodIds = matchingPeriods?.map((p) => p.id) ?? [];

  // Filter period IDs based on filterRestaurantId
  const effectivePeriodIds =
    filterRestaurantId && filterRestaurantId !== "all"
      ? matchingPeriods?.filter((p) => p.restaurant_id === filterRestaurantId).map((p) => p.id) ?? []
      : allPeriodIds;

  // 3. Load weeks from effective periods
  const { data: weeks } = useQuery({
    queryKey: ["weeks-cross", effectivePeriodIds],
    queryFn: async () => {
      if (!effectivePeriodIds.length) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .in("period_id", effectivePeriodIds)
        .order("week_number");
      if (error) throw error;
      return data;
    },
    enabled: effectivePeriodIds.length > 0,
  });

  // Deduplicate weeks by week_number (take first occurrence for display)
  const uniqueWeeks = weeks
    ? Object.values(
        weeks.reduce(
          (acc, w) => {
            if (!acc[w.week_number]) acc[w.week_number] = w;
            return acc;
          },
          {} as Record<number, (typeof weeks)[0]>
        )
      )
    : [];

  const allWeekIds = weeks?.map((w) => w.id) ?? [];

  // 4. Load shifts from ALL weeks (zt_shifts table)
  const { data: shifts } = useQuery({
    queryKey: ["zt-shifts-cross", effectivePeriodIds, allWeekIds],
    queryFn: async () => {
      if (!allWeekIds.length) return [];
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("*")
        .in("week_id", allWeekIds);
      if (error) throw error;
      return data;
    },
    enabled: allWeekIds.length > 0,
  });

  // 5. Load ALL employees that have zt_department set, via staff_restaurants
  const { data: allStaffRestaurants } = useQuery({
    queryKey: ["all-zt-staff-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, restaurant_id, staff!inner(id, perso_nr, name, first_name, last_name, nickname, is_active)")
        .not("zt_department", "is", null);
      if (error) throw error;
      return data as any[];
    },
  });

  // Build employee list: one entry per employee+department combination
  const employees: ZtEmployee[] = (() => {
    if (!allStaffRestaurants) return [];
    const empMap = new Map<string, ZtEmployee>();

    for (const row of allStaffRestaurants) {
      if (!row.staff || row.staff.is_active === false) continue;
      const empId = row.staff.id;
      const key = `${empId}-${row.zt_department}`;

      const isRelevant =
        !filterRestaurantId ||
        filterRestaurantId === "all" ||
        row.restaurant_id === filterRestaurantId;

      if (isRelevant && !empMap.has(key)) {
        empMap.set(key, {
          id: empId,
          perso_nr: row.staff.perso_nr ?? 0,
          name: row.staff.name ?? "",
          first_name: row.staff.first_name ?? "",
          last_name: row.staff.last_name ?? "",
          nickname: row.staff.nickname,
          department: row.zt_department,
        });
      }
    }

    return Array.from(empMap.values());
  })();

  // Map week_number to all week IDs for that week (across restaurants)
  const weekNumberToIds = weeks
    ? weeks.reduce(
        (acc, w) => {
          if (!acc[w.week_number]) acc[w.week_number] = [];
          acc[w.week_number].push(w.id);
          return acc;
        },
        {} as Record<number, string[]>
      )
    : {};

  return {
    selectedPeriod,
    matchingPeriods,
    effectivePeriodIds,
    weeks: uniqueWeeks,
    allWeekIds,
    weekNumberToIds,
    shifts,
    employees,
  };
}
