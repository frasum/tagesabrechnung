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
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("id, week_id, employee_id, shift_date, start_time, end_time, total_hours, evening_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, absence_type, department")
        .in("week_id", weekIds);
      if (error) throw error;
      return data;
    },
    enabled: enabled && weekIds.length > 0,
  });

  // 4. Load all employees across all restaurants (with zt_department)
  const { data: employees } = useQuery({
    queryKey: ["cumulated-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)")
        .not("zt_department", "is", null);
      if (error) throw error;

      // Deduplicate by staff.id + department
      const seen = new Set<string>();
      const result: RestaurantEmployee[] = [];
      for (const row of data as any[]) {
        const key = `${row.staff.id}-${row.zt_department}`;
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

  return {
    employees,
    shifts,
    weeks: deduplicatedWeeks,
    allWeekIds: weekIds,
    weekNumberToAllIds,
    payrollNotes,
    advances,
    matchingPeriods,
  };
}
