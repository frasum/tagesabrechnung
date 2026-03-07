import { useMemo, useCallback, useEffect, useState } from "react";
import { useSelectedDate } from "@/contexts/DateContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useZt } from "@/contexts/ZtContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/types/permissions";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Switch } from "@/components/ui/switch";
import { useCommissionAddToGross } from "@/hooks/useSettings";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, ChevronDown } from "lucide-react";

const GL_ROLES = new Set(["gl", "kitchen_gl"]);

type WaiterAggregate = {
  staffId: string | null;
  name: string;
  revenue: number;
  hours: number;
  commission: number;
};

type DayBreakdown = {
  date: string;
  staffCount: number;
  staffNames: string[];
  hours: number;
  revenue: number;
  allDeptHours: number;
};

export default function ZtProvision() {
  const { selectedPeriodId, periods } = useZt();
  const { restaurantId, restaurantSlug } = useRestaurant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedDate } = useSelectedDate();
  const { user } = useAuth();
  const isAdmin = hasPermission(user?.permissionLevel || 'staff', 'admin');
  const { commissionAddToGross, updateCommissionAddToGross } = useCommissionAddToGross(restaurantId);

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);

  const [minRevenue, setMinRevenue] = useState(1200);
  const [commissionPct, setCommissionPct] = useState(5);

  // Load saved threshold from settings
  const { data: savedThreshold } = useQuery({
    queryKey: ["settings", "commission_min_revenue", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "commission_min_revenue")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      return (data?.value as any)?.amount ?? 1200;
    },
    enabled: !!restaurantId,
  });

  const { data: savedPct } = useQuery({
    queryKey: ["settings", "commission_pct", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "commission_pct")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      return (data?.value as any)?.pct ?? 5;
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (savedThreshold != null) setMinRevenue(savedThreshold);
  }, [savedThreshold]);

  useEffect(() => {
    if (savedPct != null) setCommissionPct(savedPct);
  }, [savedPct]);

  const handleMinRevenueChange = useCallback((val: number) => {
    setMinRevenue(val);
  }, []);

  const handleCommissionPctChange = useCallback((val: number) => {
    setCommissionPct(val);
  }, []);

  const handleMinRevenueBlur = useCallback(async () => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", "commission_min_revenue")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (existing) {
      await supabase.from("settings").update({ value: { amount: minRevenue } }).eq("id", existing.id);
    } else {
      await supabase.from("settings").insert({ key: "commission_min_revenue", value: { amount: minRevenue }, restaurant_id: restaurantId });
    }
    queryClient.invalidateQueries({ queryKey: ["settings", "commission_min_revenue", restaurantId] });
  }, [minRevenue, restaurantId, queryClient]);

  const handleCommissionPctBlur = useCallback(async () => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", "commission_pct")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (existing) {
      await supabase.from("settings").update({ value: { pct: commissionPct } }).eq("id", existing.id);
    } else {
      await supabase.from("settings").insert({ key: "commission_pct", value: { pct: commissionPct }, restaurant_id: restaurantId });
    }
    queryClient.invalidateQueries({ queryKey: ["settings", "commission_pct", restaurantId] });
  }, [commissionPct, restaurantId, queryClient]);

  // Fetch waiter shifts for the selected period date range
  const { data: waiterData, isLoading } = useQuery({
    queryKey: ["provision-waiter-shifts", selectedPeriodId, restaurantId],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const { data, error } = await supabase
        .from("waiter_shifts")
        .select("staff_id, waiter_name, second_waiter_name, additional_waiters, pos_sales, hours_worked, sessions!inner(session_date, restaurant_id)")
        .eq("sessions.restaurant_id", restaurantId)
        .gte("sessions.session_date", selectedPeriod.start_date)
        .lte("sessions.session_date", selectedPeriod.end_date);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod && !!restaurantId,
  });

  // Fetch zt_shifts hours for the period (Service department only)
  const { data: ztShiftsData } = useQuery({
    queryKey: ["provision-zt-shifts", selectedPeriodId, restaurantId],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      // Get Service staff for this restaurant
      const { data: serviceStaff, error: srErr } = await supabase
        .from("staff_restaurants")
        .select("staff_id")
        .eq("restaurant_id", restaurantId)
        .eq("zt_department", "Service");
      if (srErr) throw srErr;
      const staffIds = serviceStaff?.map(s => s.staff_id) ?? [];
      if (!staffIds.length) return [];

      const { data, error } = await supabase
        .from("zt_shifts")
        .select("employee_id, shift_date, total_hours")
        .in("employee_id", staffIds)
        .eq("department", "Service")
        .gte("shift_date", selectedPeriod.start_date)
        .lte("shift_date", selectedPeriod.end_date);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod && !!restaurantId,
  });

  // Fetch ALL zt_shifts (all departments) for hourly revenue calc
  const { data: allDeptShiftsData } = useQuery({
    queryKey: ["provision-all-dept-shifts", selectedPeriodId, restaurantId],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      // Get all staff for this restaurant
      const { data: allStaff, error: srErr } = await supabase
        .from("staff_restaurants")
        .select("staff_id")
        .eq("restaurant_id", restaurantId)
        .not("zt_department", "is", null);
      if (srErr) throw srErr;
      const staffIds = allStaff?.map(s => s.staff_id) ?? [];
      if (!staffIds.length) return [];

      const { data, error } = await supabase
        .from("zt_shifts")
        .select("shift_date, total_hours")
        .in("employee_id", staffIds)
        .gte("shift_date", selectedPeriod.start_date)
        .lte("shift_date", selectedPeriod.end_date);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod && !!restaurantId,
  });

  // Build allDeptHours by date
  const allDeptHoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!allDeptShiftsData?.length) return map;
    for (const s of allDeptShiftsData) {
      const h = Number(s.total_hours) || 0;
      map.set(s.shift_date, (map.get(s.shift_date) ?? 0) + h);
    }
    return map;
  }, [allDeptShiftsData]);

  // Fetch staff roles to exclude GL
  const { data: staffRoles } = useQuery({
    queryKey: ["staff-roles-for-provision"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, role")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Set of staff IDs with GL roles + name-based lookup for secondary waiters
  const glStaffIds = useMemo(() => {
    if (!staffRoles) return new Set<string>();
    return new Set(staffRoles.filter(s => GL_ROLES.has(s.role)).map(s => s.id));
  }, [staffRoles]);

  // Map staff names to IDs for GL checking of secondary waiters
  const { data: allStaffNames } = useQuery({
    queryKey: ["staff-names-for-provision"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, nickname")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const staffNameToId = useMemo(() => {
    if (!allStaffNames) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const s of allStaffNames) {
      map.set(s.name.toLowerCase(), s.id);
      if (s.nickname) map.set(s.nickname.toLowerCase(), s.id);
    }
    return map;
  }, [allStaffNames]);

  const isGlByName = useCallback((name: string) => {
    const id = staffNameToId.get(name.toLowerCase());
    return id ? glStaffIds.has(id) : false;
  }, [staffNameToId, glStaffIds]);

  // Build zt_shifts lookup: staffId → total hours, and staffId+date → hours
  const { ztHoursByStaff, ztHoursByStaffDate } = useMemo(() => {
    const byStaff = new Map<string, number>();
    const byStaffDate = new Map<string, number>();
    if (!ztShiftsData?.length) return { ztHoursByStaff: byStaff, ztHoursByStaffDate: byStaffDate };
    for (const s of ztShiftsData) {
      const h = Number(s.total_hours) || 0;
      byStaff.set(s.employee_id, (byStaff.get(s.employee_id) ?? 0) + h);
      const key = `${s.employee_id}:${s.shift_date}`;
      byStaffDate.set(key, (byStaffDate.get(key) ?? 0) + h);
    }
    return { ztHoursByStaff: byStaff, ztHoursByStaffDate: byStaffDate };
  }, [ztShiftsData]);

  // Filter out GL staff from waiter data
  const filteredWaiterData = useMemo(() => {
    if (!waiterData?.length) return [];
    return waiterData.filter(ws => !ws.staff_id || !glStaffIds.has(ws.staff_id));
  }, [waiterData, glStaffIds]);

  // Aggregate by staff (using filtered data), prefer zt_shifts hours
  const aggregated = useMemo<WaiterAggregate[]>(() => {
    if (!filteredWaiterData.length) return [];
    const map = new Map<string, { staffId: string | null; name: string; revenue: number; waiterHours: number }>();
    for (const ws of filteredWaiterData) {
      const key = ws.staff_id || ws.waiter_name;
      const existing = map.get(key);
      if (existing) {
        existing.revenue += Number(ws.pos_sales) || 0;
        existing.waiterHours += Number(ws.hours_worked) || 0;
      } else {
        map.set(key, {
          staffId: ws.staff_id,
          name: ws.waiter_name,
          revenue: Number(ws.pos_sales) || 0,
          waiterHours: Number(ws.hours_worked) || 0,
        });
      }
      // Add secondary waiters as separate entries (0 revenue, hours from zt_shifts)
      const secondaryNames: string[] = [];
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
        secondaryNames.push(ws.second_waiter_name);
      }
      if (ws.additional_waiters?.length) {
        for (const aw of ws.additional_waiters) {
          if (aw && !isGlByName(aw)) secondaryNames.push(aw);
        }
      }
      for (const name of secondaryNames) {
        const sid = staffNameToId.get(name.toLowerCase()) ?? null;
        const sKey = sid || `secondary:${name}`;
        if (!map.has(sKey)) {
          map.set(sKey, { staffId: sid, name, revenue: 0, waiterHours: 0 });
        }
      }
    }
    return Array.from(map.values()).map(e => {
      const ztHours = e.staffId ? ztHoursByStaff.get(e.staffId) : undefined;
      return { ...e, hours: ztHours ?? e.waiterHours, commission: 0 };
    });
  }, [filteredWaiterData, ztHoursByStaff, isGlByName, staffNameToId]);

  // Count unique sessions (days) and staffDays (using filtered data), including secondary waiters
  const { sessionCount, staffDays } = useMemo(() => {
    if (!filteredWaiterData.length) return { sessionCount: 0, staffDays: 0 };
    const dateStaffMap = new Map<string, Set<string>>();
    for (const ws of filteredWaiterData) {
      const session = ws.sessions as any;
      const date = session?.session_date;
      if (!date) continue;
      const key = ws.staff_id || ws.waiter_name;
      if (!dateStaffMap.has(date)) dateStaffMap.set(date, new Set());
      dateStaffMap.get(date)!.add(key);
      // Count second_waiter_name
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
        const sid = staffNameToId.get(ws.second_waiter_name.toLowerCase());
        dateStaffMap.get(date)!.add(sid || `secondary:${ws.second_waiter_name}`);
      }
      if (ws.additional_waiters?.length) {
        for (const aw of ws.additional_waiters) {
          if (aw && !isGlByName(aw)) {
            const sid = staffNameToId.get(aw.toLowerCase());
            dateStaffMap.get(date)!.add(sid || `secondary:${aw}`);
          }
        }
      }
    }
    let total = 0;
    for (const staff of dateStaffMap.values()) total += staff.size;
    return { sessionCount: dateStaffMap.size, staffDays: total };
  }, [filteredWaiterData, isGlByName, staffNameToId]);

  // Daily breakdown (using filtered data), prefer zt_shifts hours per staff/day
  const dailyBreakdown = useMemo<DayBreakdown[]>(() => {
    if (!filteredWaiterData.length) return [];
    const dayMap = new Map<string, { staffSet: Set<string>; nameSet: Set<string>; waiterHours: number; revenue: number; staffIdsOnDate: Set<string> }>();
    for (const ws of filteredWaiterData) {
      const session = ws.sessions as any;
      const date = session?.session_date;
      if (!date) continue;
      const key = ws.staff_id || ws.waiter_name;
      if (!dayMap.has(date)) dayMap.set(date, { staffSet: new Set(), nameSet: new Set(), waiterHours: 0, revenue: 0, staffIdsOnDate: new Set() });
      const day = dayMap.get(date)!;
      if (!day.staffSet.has(key)) {
        day.staffSet.add(key);
        day.nameSet.add(ws.waiter_name);
        if (ws.staff_id) day.staffIdsOnDate.add(ws.staff_id);
      }
      day.waiterHours += Number(ws.hours_worked) || 0;
      day.revenue += Number(ws.pos_sales) || 0;
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
        const sid = staffNameToId.get(ws.second_waiter_name.toLowerCase());
        const sKey = sid || `secondary:${ws.second_waiter_name}`;
        if (!day.staffSet.has(sKey)) {
          day.staffSet.add(sKey);
          day.nameSet.add(ws.second_waiter_name);
        }
        if (sid) day.staffIdsOnDate.add(sid);
      }
      if (ws.additional_waiters?.length) {
        for (const aw of ws.additional_waiters) {
          if (aw && !isGlByName(aw)) {
            const awSid = staffNameToId.get(aw.toLowerCase());
            const aKey = awSid || `secondary:${aw}`;
            if (!day.staffSet.has(aKey)) {
              day.staffSet.add(aKey);
              day.nameSet.add(aw);
            }
            if (awSid) day.staffIdsOnDate.add(awSid);
          }
        }
      }
    }
    return Array.from(dayMap.entries())
      .map(([date, d]) => {
        // Sum zt_shifts hours for all staff on this date, fall back to waiter hours
        let ztTotal = 0;
        let hasZt = false;
        for (const sid of d.staffIdsOnDate) {
          const h = ztHoursByStaffDate.get(`${sid}:${date}`);
          if (h != null) { ztTotal += h; hasZt = true; }
        }
        return { date, staffCount: d.staffSet.size, staffNames: Array.from(d.nameSet).sort(), hours: hasZt ? ztTotal : d.waiterHours, revenue: d.revenue, allDeptHours: allDeptHoursByDate.get(date) ?? 0 };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredWaiterData, isGlByName, ztHoursByStaffDate, staffNameToId, allDeptHoursByDate]);

  // Commission calculation — day-by-day evaluation
  const result = useMemo(() => {
    const staffCount = aggregated.length;
    const totalRevenue = aggregated.reduce((s, w) => s + w.revenue, 0);
    const totalHours = aggregated.reduce((s, w) => s + w.hours, 0);
    const avgRevenue = staffDays > 0 ? totalRevenue / staffDays : 0;

    // Per-day: only days where avg revenue per staff >= threshold contribute
    let pool = 0;
    let qualifyingDays = 0;
    for (const day of dailyBreakdown) {
      const dayAvg = day.staffCount > 0 ? day.revenue / day.staffCount : 0;
      if (dayAvg >= minRevenue) {
        const excess = day.revenue - (minRevenue * day.staffCount);
        pool += Math.max(0, excess * (commissionPct / 100));
        qualifyingDays++;
      }
    }

    const thresholdMet = pool > 0;
    const hourlyRate = totalHours > 0 ? pool / totalHours : 0;
    const withCommission = aggregated.map(w => ({
      ...w,
      commission: thresholdMet ? hourlyRate * w.hours : 0,
    }));

    const totalCommission = withCommission.reduce((s, w) => s + w.commission, 0);

    return { staffCount, totalRevenue, totalHours, avgRevenue, thresholdMet, pool, withCommission, totalCommission, sessionCount, staffDays, qualifyingDays };
  }, [aggregated, minRevenue, commissionPct, sessionCount, staffDays, dailyBreakdown]);

  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

  // Route protection: admin only
  if (!isAdmin) {
    return <Navigate to={`/${restaurantSlug}/zeiterfassung`} replace />;
  }

  return (
    <div className="space-y-6">
      {/* Threshold input */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Mindest-Ø-Umsatz / Tag / MA</label>
          <div className="w-48">
            <CurrencyInput
              value={minRevenue}
              onChange={handleMinRevenueChange}
              onBlur={handleMinRevenueBlur}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Provisionssatz</label>
          <div className="w-32">
            <CurrencyInput
              value={commissionPct}
              onChange={handleCommissionPctChange}
              onBlur={handleCommissionPctBlur}
              suffix="%"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 self-end pb-0.5">
          <Switch
            checked={commissionAddToGross}
            onCheckedChange={(checked) => updateCommissionAddToGross({ enabled: checked, restaurantId })}
          />
          <label className="text-sm font-medium text-foreground">Provision zum Brutto addieren</label>
        </div>
      </div>

      {/* Summary cards */}
      {selectedPeriod && (
        <p className="text-sm text-muted-foreground">
          Zeitraum: {new Date(selectedPeriod.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {new Date(selectedPeriod.end_date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} · ohne reine GL-Mitarbeiter
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ø Umsatz / Tag / MA</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.avgRevenue)} €</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Σ Stunden</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.totalHours)} h</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Provisions-Topf</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.pool)} €</p>
          <p className="text-xs text-muted-foreground mt-1">{result.qualifyingDays} von {sessionCount} Tagen qualifiziert</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Σ Provisionen</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.totalCommission)} €</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(result.totalHours > 0 ? result.totalCommission / result.totalHours : 0)} € / Stunde
          </p>
        </div>
      </div>

      {/* Daily breakdown */}
      {dailyBreakdown.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            Tagesdetails ({dailyBreakdown.length} Tage)
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Anzahl der Servicekräfte</TableHead>
                  <TableHead className="text-right">Stunden (h)</TableHead>
                  <TableHead className="text-right">Umsatz (€)</TableHead>
                  <TableHead className="text-right">Ø / MA (€)</TableHead>
                   <TableHead className="text-right">
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <span className="cursor-help underline decoration-dotted underline-offset-4">Ø €/h (alle)</span>
                         </TooltipTrigger>
                         <TooltipContent side="top">Umsatz pro Stunde · inkl. Service, Küche & GL</TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </TableHead>
                  <TableHead className="text-right">Prov. (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyBreakdown.map((day) => {
                  const avgPerStaff = day.staffCount > 0 ? day.revenue / day.staffCount : 0;
                  const belowThreshold = avgPerStaff < minRevenue;
                  const hourlyRevenue = day.allDeptHours > 0 ? day.revenue / day.allDeptHours : 0;
                  const dayCommission = avgPerStaff >= minRevenue ? Math.max(0, (day.revenue - minRevenue * day.staffCount) * (commissionPct / 100)) : 0;
                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{fmtDate(day.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted underline-offset-4">{day.staffCount}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <ul className="space-y-0.5 text-xs">
                                {day.staffNames.map((name) => (
                                  <li key={name}>• {name}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums cursor-pointer hover:text-primary hover:underline underline-offset-4 transition-colors"
                        onClick={() => navigate(`/${restaurantSlug}/zeiterfassung?date=${day.date}`)}
                      >
                        {fmt(day.hours)}
                      </TableCell>
                      <TableCell
                        className="text-right tabular-nums cursor-pointer hover:text-primary hover:underline underline-offset-4 transition-colors"
                        onClick={() => {
                          setSelectedDate(new Date(day.date + "T00:00:00"));
                          navigate(`/${restaurantSlug}`);
                        }}
                      >
                        {fmt(day.revenue)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${belowThreshold ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                        {fmt(avgPerStaff)}
                      </TableCell>
                       <TableCell className="text-right tabular-nums">
                         {day.allDeptHours > 0 ? `${fmt(hourlyRevenue)} €` : "–"}
                       </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${dayCommission > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {fmt(dayCommission)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Gesamt</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {dailyBreakdown.reduce((s, d) => s + d.staffCount, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(dailyBreakdown.reduce((s, d) => s + d.hours, 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(dailyBreakdown.reduce((s, d) => s + d.revenue, 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(result.avgRevenue)}
                  </TableCell>
                   <TableCell className="text-right tabular-nums font-semibold">
                     {(() => {
                       const totalRev = dailyBreakdown.reduce((s, d) => s + d.revenue, 0);
                       const totalAllH = dailyBreakdown.reduce((s, d) => s + d.allDeptHours, 0);
                       return totalAllH > 0 ? `${fmt(totalRev / totalAllH)} €` : "–";
                     })()}
                   </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                    {fmt(result.pool)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}

      {result.withCommission.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Verteilung des Provisions-Topfs nach geleisteten Stunden · {result.sessionCount} Abrechnungstage
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Umsatz (€)</TableHead>
              <TableHead className="text-right">Stunden (h)</TableHead>
              <TableHead className="text-right">Provision (€)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.withCommission.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Keine Service-Schichten in dieser Periode
                </TableCell>
              </TableRow>
            ) : (
              result.withCommission
                .sort((a, b) => b.revenue - a.revenue)
                .map((w) => (
                  <TableRow key={w.staffId || w.name}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(w.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(w.hours)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(w.commission)}</TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
          {result.withCommission.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Gesamt</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(result.totalRevenue)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(result.totalHours)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(result.totalCommission)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}
