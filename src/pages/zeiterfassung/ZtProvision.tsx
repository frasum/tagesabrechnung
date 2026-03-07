import { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useZt } from "@/contexts/ZtContext";
import { useRestaurant } from "@/hooks/useRestaurant";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type WaiterAggregate = {
  staffId: string | null;
  name: string;
  revenue: number;
  hours: number;
  commission: number;
};

export default function ZtProvision() {
  const { selectedPeriodId, periods } = useZt();
  const { restaurantId } = useRestaurant();
  const queryClient = useQueryClient();

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
        .select("staff_id, waiter_name, pos_sales, hours_worked, sessions!inner(session_date, restaurant_id)")
        .eq("sessions.restaurant_id", restaurantId)
        .gte("sessions.session_date", selectedPeriod.start_date)
        .lte("sessions.session_date", selectedPeriod.end_date);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod && !!restaurantId,
  });

  // Aggregate by staff
  const aggregated = useMemo<WaiterAggregate[]>(() => {
    if (!waiterData?.length) return [];
    const map = new Map<string, { staffId: string | null; name: string; revenue: number; hours: number }>();
    for (const ws of waiterData) {
      const key = ws.staff_id || ws.waiter_name;
      const existing = map.get(key);
      if (existing) {
        existing.revenue += Number(ws.pos_sales) || 0;
        existing.hours += Number(ws.hours_worked) || 0;
      } else {
        map.set(key, {
          staffId: ws.staff_id,
          name: ws.waiter_name,
          revenue: Number(ws.pos_sales) || 0,
          hours: Number(ws.hours_worked) || 0,
        });
      }
    }
    return Array.from(map.values()).map(e => ({ ...e, commission: 0 }));
  }, [waiterData]);

  // Count unique sessions (days) and staffDays (sum of distinct staff per day)
  const { sessionCount, staffDays } = useMemo(() => {
    if (!waiterData?.length) return { sessionCount: 0, staffDays: 0 };
    const dateStaffMap = new Map<string, Set<string>>();
    for (const ws of waiterData) {
      const session = ws.sessions as any;
      const date = session?.session_date;
      if (!date) continue;
      const key = ws.staff_id || ws.waiter_name;
      if (!dateStaffMap.has(date)) dateStaffMap.set(date, new Set());
      dateStaffMap.get(date)!.add(key);
    }
    let total = 0;
    for (const staff of dateStaffMap.values()) total += staff.size;
    return { sessionCount: dateStaffMap.size, staffDays: total };
  }, [waiterData]);

  // Commission calculation
  const result = useMemo(() => {
    const staffCount = aggregated.length;
    const totalRevenue = aggregated.reduce((s, w) => s + w.revenue, 0);
    const totalHours = aggregated.reduce((s, w) => s + w.hours, 0);
    const avgRevenue = staffDays > 0 ? totalRevenue / staffDays : 0;
    const thresholdMet = avgRevenue >= minRevenue && staffDays > 0;

    let pool = 0;
    if (thresholdMet) {
      const excess = totalRevenue - (minRevenue * staffDays);
      pool = Math.max(0, excess * (commissionPct / 100));
    }

    const hourlyRate = totalHours > 0 ? pool / totalHours : 0;
    const withCommission = aggregated.map(w => ({
      ...w,
      commission: thresholdMet ? hourlyRate * w.hours : 0,
    }));

    const totalCommission = withCommission.reduce((s, w) => s + w.commission, 0);

    return { staffCount, totalRevenue, totalHours, avgRevenue, thresholdMet, pool, withCommission, totalCommission, sessionCount, staffDays };
  }, [aggregated, minRevenue, commissionPct, sessionCount, staffDays]);

  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <div className="pt-5">
          {result.sessionCount > 0 ? (
            <Badge variant={result.thresholdMet ? "default" : "destructive"} className="text-sm px-3 py-1">
              {result.thresholdMet ? "✓ Erreicht" : "✗ Nicht erreicht"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-sm px-3 py-1">Keine Daten</Badge>
          )}
        </div>
      </div>

      {/* Summary cards */}
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
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Σ Provisionen</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.totalCommission)} €</p>
        </div>
      </div>

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
