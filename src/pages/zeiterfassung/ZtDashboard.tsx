import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRestaurant, useRestaurants } from "@/contexts/RestaurantContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";

export default function ZtDashboard() {
  const { restaurantId: selectedRestaurantId } = useRestaurant();
  const { data: restaurants } = useRestaurants();

  // Load ALL staff with zt_department across all restaurants
  const { data: allStaffRestaurants } = useQuery({
    queryKey: ["zt-staff-restaurants-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, restaurant_id, staff!inner(id, perso_nr, first_name, last_name, nickname, is_active)")
        .not("zt_department", "is", null);
      if (error) throw error;
      return data as any[];
    },
  });

  // Deduplicate employees – each employee counted once per unique department
  const employees = (() => {
    if (!allStaffRestaurants) return [];
    const seen = new Set<string>();
    const result: { id: string; department: string }[] = [];
    for (const row of allStaffRestaurants) {
      if (!row.staff || row.staff.is_active === false) continue;
      const key = `${row.staff.id}_${row.zt_department}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id: row.staff.id, department: row.zt_department });
      }
    }
    return result;
  })();

  const uniqueEmpIds = new Set(employees.map((e) => e.id));
  const employeeCount = uniqueEmpIds.size;

  const deptCounts = {
    Küche: employees.filter((e) => e.department === "Küche").length,
    GL: employees.filter((e) => e.department === "GL").length,
    Service: employees.filter((e) => e.department === "Service").length,
  };

  const chartData = [
    { name: "Küche", mitarbeiter: deptCounts.Küche, fill: "hsl(var(--chart-1))" },
    { name: "GL", mitarbeiter: deptCounts.GL, fill: "hsl(var(--chart-2))" },
    { name: "Service", mitarbeiter: deptCounts.Service, fill: "hsl(var(--chart-3))" },
  ];

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: periods } = useQuery({
    queryKey: ["zt-periods-dashboard", selectedRestaurantId, today],
    queryFn: async () => {
      if (!selectedRestaurantId) return [];
      const { data, error } = await supabase
        .from("scheduling_periods")
        .select("*")
        .eq("restaurant_id", selectedRestaurantId)
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRestaurantId,
  });

  const currentPeriod = periods?.[0];

  // Daily overview: last 14 days
  const fourteenDaysAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");

  const { data: allEmpRestMapping } = useQuery({
    queryKey: ["zt-emp-rest-mapping-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("staff_id, restaurant_id")
        .not("zt_department", "is", null);
      if (error) throw error;
      return data as { staff_id: string; restaurant_id: string }[];
    },
  });

  const { data: allDailyShifts } = useQuery({
    queryKey: ["zt-daily-shifts-all", fourteenDaysAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("shift_date, total_hours, employee_id")
        .gte("shift_date", fourteenDaysAgo)
        .is("absence_type", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allDailyRevenue } = useQuery({
    queryKey: ["zt-daily-revenue-all", fourteenDaysAgo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_revenue")
        .select("revenue_date, total_revenue, restaurant_id")
        .gte("revenue_date", fourteenDaysAgo);
      if (error) throw error;
      return data as { revenue_date: string; total_revenue: number; restaurant_id: string }[];
    },
  });

  // Build per-restaurant daily overviews
  const perRestaurantOverview = (() => {
    if (!restaurants?.length) return [];

    const empToRestaurants = new Map<string, Set<string>>();
    for (const m of allEmpRestMapping ?? []) {
      if (!empToRestaurants.has(m.staff_id)) empToRestaurants.set(m.staff_id, new Set());
      empToRestaurants.get(m.staff_id)!.add(m.restaurant_id);
    }

    return restaurants.map((restaurant) => {
      const byDate: Record<string, { hours: number; revenue: number }> = {};

      for (const shift of allDailyShifts ?? []) {
        const restIds = empToRestaurants.get(shift.employee_id);
        if (!restIds?.has(restaurant.id)) continue;
        const d = shift.shift_date;
        if (!byDate[d]) byDate[d] = { hours: 0, revenue: 0 };
        byDate[d].hours += Number(shift.total_hours) || 0;
      }

      for (const rev of allDailyRevenue ?? []) {
        if (rev.restaurant_id !== restaurant.id) continue;
        const d = rev.revenue_date;
        if (!byDate[d]) byDate[d] = { hours: 0, revenue: 0 };
        byDate[d].revenue = Number(rev.total_revenue) || 0;
      }

      const rows = Object.entries(byDate)
        .filter(([, { hours, revenue }]) => hours > 0 || revenue > 0)
        .map(([date, { hours, revenue }]) => ({
          date,
          hours: Math.round(hours * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          revenuePerHour: hours > 0 ? Math.round((revenue / hours) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      return { restaurant, rows };
    });
  })();

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Zeiterfassung – Übersicht</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mitarbeiter</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktuelle Periode</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriod?.label ?? "Keine"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Küche</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptCounts.Küche}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Service</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deptCounts.Service}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiter nach Abteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="mitarbeiter" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {perRestaurantOverview.map(({ restaurant, rows }) => (
        <Card key={restaurant.id}>
          <CardHeader>
            <CardTitle>Tagesübersicht – {restaurant.name} (letzte 14 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Daten vorhanden.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Stunden</TableHead>
                    <TableHead className="text-right">Umsatz (€)</TableHead>
                    <TableHead className="text-right">€/Stunde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{format(new Date(row.date + "T00:00:00"), "EEE dd.MM.yyyy", { locale: de })}</TableCell>
                      <TableCell className="text-right">{row.hours.toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell className="text-right">
                        {row.revenue > 0 ? row.revenue.toLocaleString("de-DE", { minimumFractionDigits: 2 }) : "–"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.revenue > 0 && row.hours > 0
                          ? row.revenuePerHour.toLocaleString("de-DE", { minimumFractionDigits: 2 })
                          : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
