import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import type { RestaurantEmployee } from "./useRestaurantEmployees";

type Period = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  restaurant_id: string | null;
};

type Week = {
  id: string;
  period_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
};

export function useCumulatedZtData(
  enabled: boolean,
  selectedPeriod: { start_date: string; end_date: string } | undefined
) {
  // 1. Load all periods matching the same date range across all restaurants
  const { data: matchingPeriods } = useQuery({
    queryKey: ["cumulated-periods", selectedPeriod?.start_date, selectedPeriod?.end_date],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const { data, error } = await supabase
        .from("scheduling_periods")
        .select("id, label, start_date, end_date, status, restaurant_id")
        .eq("start_date", selectedPeriod.start_date)
        .eq("end_date", selectedPeriod.end_date);
      if (error) throw error;
      return data as Period[];
    },
    enabled: enabled && !!selectedPeriod,
  });

  const allPeriodIds = useMemo(() => matchingPeriods?.map(p => p.id) ?? [], [matchingPeriods]);

  // 2. Load all weeks for these periods
  const { data: weeks } = useQuery({
    queryKey: ["cumulated-weeks", allPeriodIds],
    queryFn: async () => {
      if (!allPeriodIds.length) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("id, period_id, week_number, start_date, end_date")
        .in("period_id", allPeriodIds)
        .order("week_number");
      if (error) throw error;
      return data as Week[];
    },
    enabled: enabled && allPeriodIds.length > 0,
  });

  const weekIds = useMemo(() => weeks?.map(w => w.id) ?? [], [weeks]);

  // 3. Load all shifts for these weeks
  const { data: shifts } = useQuery({
    queryKey: ["cumulated-shifts", weekIds],
    queryFn: async () => {
      if (!weekIds.length) return [];
      // Paginated fetch to avoid silent truncation at 5000 rows
      const PAGE_SIZE = 5000;
      let allRows: any[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("zt_shifts")
          .select("id, week_id, employee_id, shift_date, start_time, end_time, total_hours, evening_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, absence_type, department")
          .in("week_id", weekIds)
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        allRows = allRows.concat(data ?? []);
        if (!data || data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return allRows;
    },
    enabled: enabled && weekIds.length > 0,
  });

  // 4. Load all employees across all restaurants (with zt_department + restaurant name)
  const { data: employees } = useQuery({
    queryKey: ["cumulated-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, restaurant_id, restaurants(name), staff!inner(id, name, perso_nr, first_name, last_name, nickname, date_of_birth)")
        .not("zt_department", "is", null)
        .eq("staff.is_active", true);
      if (error) throw error;

      // Deduplicate by staff.id + department + restaurant_id
      const seen = new Set<string>();
      const result: RestaurantEmployee[] = [];
      for (const row of data as any[]) {
        const key = `${row.staff.id}-${row.zt_department}-${row.restaurant_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          id: row.staff.id,
          name: row.staff.name,
          perso_nr: row.staff.perso_nr,
          first_name: row.staff.first_name,
          last_name: row.staff.last_name,
          nickname: row.staff.nickname,
          department: row.zt_department,
          date_of_birth: row.staff.date_of_birth ?? null,
          restaurant_name: row.restaurants?.name ?? undefined,
          restaurant_id: row.restaurant_id ?? undefined,
        });
      }
      return result;
    },
    enabled,
  });

  // 5. Load payroll_notes for all matching periods
  const { data: payrollNotes } = useQuery({
    queryKey: ["cumulated-payroll-notes", allPeriodIds],
    queryFn: async () => {
      if (!allPeriodIds.length) return [];
      const { data, error } = await supabase
        .from("payroll_notes")
        .select("id, employee_id, period_id, vorschuss, urlaub_tage, besonderheiten")
        .in("period_id", allPeriodIds);
      if (error) throw error;
      return data;
    },
    enabled: enabled && allPeriodIds.length > 0,
  });

  // 6. Load advances for the date range across all restaurants
  const { data: advances } = useQuery({
    queryKey: ["cumulated-advances", selectedPeriod?.start_date, selectedPeriod?.end_date],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const { data, error } = await supabase
        .from("advances")
        .select("*, sessions!inner(session_date)")
        .gte("sessions.session_date", selectedPeriod.start_date)
        .lte("sessions.session_date", selectedPeriod.end_date);
      if (error) throw error;
      return (data as any[]).map(d => ({
        staff_name: d.staff_name as string,
        amount: d.amount as number,
        date: d.sessions.session_date as string,
      }));
    },
    enabled: enabled && !!selectedPeriod,
  });

  // Deduplicate weeks by week_number (take first occurrence)
  const deduplicatedWeeks = useMemo(() => {
    if (!weeks) return undefined;
    const seen = new Set<number>();
    const result: Week[] = [];
    for (const w of weeks) {
      if (seen.has(w.week_number)) continue;
      seen.add(w.week_number);
      result.push(w);
    }
    return result;
  }, [weeks]);

  // Build weekNumber -> all weekIds mapping (across all restaurants)
  const weekNumberToAllIds = useMemo(() => {
    const map: Record<number, string[]> = {};
    weeks?.forEach(w => {
      (map[w.week_number] ??= []).push(w.id);
    });
    return map;
  }, [weeks]);

  // Build weekId -> restaurantId mapping (via period)
  const weekIdToRestaurantId = useMemo(() => {
    const periodToRestaurant: Record<string, string> = {};
    matchingPeriods?.forEach(p => {
      if (p.restaurant_id) periodToRestaurant[p.id] = p.restaurant_id;
    });
    const map: Record<string, string> = {};
    weeks?.forEach(w => {
      const rid = periodToRestaurant[w.period_id];
      if (rid) map[w.id] = rid;
    });
    return map;
  }, [weeks, matchingPeriods]);

  return {
    employees,
    shifts,
    rawWeeks: weeks,
    weeks: deduplicatedWeeks,
    allWeekIds: weekIds,
    weekNumberToAllIds,
    weekIdToRestaurantId,
    payrollNotes,
    advances,
    matchingPeriods,
  };
}
