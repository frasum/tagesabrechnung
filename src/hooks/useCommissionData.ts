import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GL_ROLES = new Set(["gl", "kitchen_gl"]);

/**
 * Reusable hook that computes commission per staff member for a given restaurant & date range.
 * Returns a Map<staffId, commissionAmount> and the total commission pool.
 */
export function useCommissionData(restaurantId: string | undefined, startDate: string | undefined, endDate: string | undefined) {
  // Load settings
  const { data: minRevenue } = useQuery({
    queryKey: ["settings", "commission_min_revenue", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "commission_min_revenue")
        .eq("restaurant_id", restaurantId!)
        .maybeSingle();
      return (data?.value as any)?.amount ?? 1200;
    },
    enabled: !!restaurantId,
  });

  const { data: commissionPct } = useQuery({
    queryKey: ["settings", "commission_pct", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "commission_pct")
        .eq("restaurant_id", restaurantId!)
        .maybeSingle();
      return (data?.value as any)?.pct ?? 5;
    },
    enabled: !!restaurantId,
  });

  // Fetch waiter shifts
  const { data: waiterData, isLoading: wLoading } = useQuery({
    queryKey: ["commission-waiter-shifts", restaurantId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waiter_shifts")
        .select("staff_id, waiter_name, second_waiter_name, additional_waiters, pos_sales, hours_worked, sessions!inner(session_date, restaurant_id)")
        .eq("sessions.restaurant_id", restaurantId!)
        .gte("sessions.session_date", startDate!)
        .lte("sessions.session_date", endDate!);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && !!startDate && !!endDate,
  });

  // Service staff zt_shifts
  const { data: ztShiftsData } = useQuery({
    queryKey: ["commission-zt-shifts", restaurantId, startDate, endDate],
    queryFn: async () => {
      const { data: serviceStaff } = await supabase
        .from("staff_restaurants")
        .select("staff_id")
        .eq("restaurant_id", restaurantId!)
        .eq("zt_department", "Service");
      const staffIds = serviceStaff?.map(s => s.staff_id) ?? [];
      if (!staffIds.length) return [];
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("employee_id, shift_date, total_hours")
        .in("employee_id", staffIds)
        .eq("department", "Service")
        .gte("shift_date", startDate!)
        .lte("shift_date", endDate!);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && !!startDate && !!endDate,
  });

  // Staff roles
  const { data: staffRoles } = useQuery({
    queryKey: ["staff-roles-for-commission"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("id, role, name, nickname").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const result = useMemo(() => {
    const emptyResult = { commissionMap: new Map<string, number>(), totalCommission: 0, isLoading: true };
    if (!waiterData || !staffRoles || minRevenue == null || commissionPct == null) return emptyResult;

    const glIds = new Set(staffRoles.filter(s => GL_ROLES.has(s.role)).map(s => s.id));
    const nameToId = new Map<string, string>();
    for (const s of staffRoles) {
      nameToId.set(s.name.toLowerCase(), s.id);
      if (s.nickname) nameToId.set(s.nickname.toLowerCase(), s.id);
    }
    const isGlByName = (name: string) => {
      const id = nameToId.get(name.toLowerCase());
      return id ? glIds.has(id) : false;
    };

    // zt_shifts lookup
    const ztByStaff = new Map<string, number>();
    const ztByStaffDate = new Map<string, number>();
    if (ztShiftsData) {
      for (const s of ztShiftsData) {
        const h = Number(s.total_hours) || 0;
        ztByStaff.set(s.employee_id, (ztByStaff.get(s.employee_id) ?? 0) + h);
        const key = `${s.employee_id}:${s.shift_date}`;
        ztByStaffDate.set(key, (ztByStaffDate.get(key) ?? 0) + h);
      }
    }

    // Filter GL from waiter data
    const filtered = waiterData.filter(ws => !ws.staff_id || !glIds.has(ws.staff_id));

    // Build daily breakdown
    const dayMap = new Map<string, { staffSet: Set<string>; revenue: number; staffIdsOnDate: Set<string>; waiterHours: number }>();
    for (const ws of filtered) {
      const session = ws.sessions as any;
      const date = session?.session_date;
      if (!date) continue;
      const key = ws.staff_id || ws.waiter_name;
      if (!dayMap.has(date)) dayMap.set(date, { staffSet: new Set(), revenue: 0, staffIdsOnDate: new Set(), waiterHours: 0 });
      const day = dayMap.get(date)!;
      day.staffSet.add(key);
      day.revenue += Number(ws.pos_sales) || 0;
      day.waiterHours += Number(ws.hours_worked) || 0;
      if (ws.staff_id) day.staffIdsOnDate.add(ws.staff_id);
      // Secondary waiters
      const secondaries: string[] = [];
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) secondaries.push(ws.second_waiter_name);
      if (ws.additional_waiters?.length) {
        for (const aw of ws.additional_waiters) {
          if (aw && !isGlByName(aw)) secondaries.push(aw);
        }
      }
      for (const name of secondaries) {
        const sid = nameToId.get(name.toLowerCase());
        day.staffSet.add(sid || `secondary:${name}`);
        if (sid) day.staffIdsOnDate.add(sid);
      }
    }

    // Calculate pool
    let pool = 0;
    for (const [, day] of dayMap) {
      const dayAvg = day.staffSet.size > 0 ? day.revenue / day.staffSet.size : 0;
      if (dayAvg >= minRevenue) {
        const excess = day.revenue - (minRevenue * day.staffSet.size);
        pool += Math.max(0, excess * (commissionPct / 100));
      }
    }

    if (pool <= 0) return { commissionMap: new Map<string, number>(), totalCommission: 0, isLoading: false };

    // Aggregate hours per staff
    const staffHours = new Map<string, { staffId: string | null; hours: number }>();
    for (const ws of filtered) {
      const key = ws.staff_id || ws.waiter_name;
      if (!staffHours.has(key)) staffHours.set(key, { staffId: ws.staff_id, hours: 0 });
      // Secondary waiters
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
        const sid = nameToId.get(ws.second_waiter_name.toLowerCase()) ?? null;
        const sKey = sid || `secondary:${ws.second_waiter_name}`;
        if (!staffHours.has(sKey)) staffHours.set(sKey, { staffId: sid, hours: 0 });
      }
      if (ws.additional_waiters?.length) {
        for (const aw of ws.additional_waiters) {
          if (aw && !isGlByName(aw)) {
            const sid = nameToId.get(aw.toLowerCase()) ?? null;
            const aKey = sid || `secondary:${aw}`;
            if (!staffHours.has(aKey)) staffHours.set(aKey, { staffId: sid, hours: 0 });
          }
        }
      }
    }

    // Fill hours (prefer zt_shifts)
    for (const [key, entry] of staffHours) {
      if (entry.staffId && ztByStaff.has(entry.staffId)) {
        entry.hours = ztByStaff.get(entry.staffId)!;
      } else {
        // Sum from waiter_shifts
        let wHours = 0;
        for (const ws of filtered) {
          if ((ws.staff_id || ws.waiter_name) === key) wHours += Number(ws.hours_worked) || 0;
        }
        entry.hours = wHours;
      }
    }

    const totalHours = Array.from(staffHours.values()).reduce((s, e) => s + e.hours, 0);
    const hourlyRate = totalHours > 0 ? pool / totalHours : 0;

    const commissionMap = new Map<string, number>();
    for (const [, entry] of staffHours) {
      if (entry.staffId) {
        commissionMap.set(entry.staffId, (commissionMap.get(entry.staffId) ?? 0) + hourlyRate * entry.hours);
      }
    }

    return { commissionMap, totalCommission: pool, isLoading: false };
  }, [waiterData, ztShiftsData, staffRoles, minRevenue, commissionPct]);

  return {
    commissionMap: result.commissionMap,
    totalCommission: result.totalCommission,
    isLoading: wLoading || result.isLoading,
  };
}
