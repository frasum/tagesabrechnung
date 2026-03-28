import React, { useState, useMemo, useCallback, useEffect } from "react";
import SfnTooltipHeader from "@/components/zeiterfassung/SfnTooltipHeader";
import { supabase } from "@/integrations/supabase/client";
import { useCommissionData } from "@/hooks/useCommissionData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileDown, FileSpreadsheet, AlertCircle, Lock, ArrowLeft, CalendarIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import {
  formatHours, DEPARTMENT_ORDER, getDepartmentBgClass,
  countVacationDays, countSickDays, isSunday,
  getSickDateRanges, getVacationDateRanges, formatSickRanges,
} from "@/lib/shiftCalculations";
import { getEmployeeTotals } from "@/pages/zeiterfassung/buchhaltung/utils";
import { exportWochenplanPdf } from "@/lib/exportWochenplanPdf";
import { exportWochenplanExcel } from "@/lib/exportWochenplanExcel";
import { exportZusammenfassungPdf } from "@/lib/exportZusammenfassungPdf";
import { exportZusammenfassungExcel } from "@/lib/exportZusammenfassungExcel";
import { exportBuchhaltungPdf } from "@/lib/exportBuchhaltungPdf";
import { exportBuchhaltungExcel } from "@/lib/exportBuchhaltungExcel";
import { exportWochenplanCsv, exportZusammenfassungCsv, exportBuchhaltungCsv } from "@/lib/exportCsv";
import type { Shift, PayrollNote, AdvanceEntry } from "@/pages/zeiterfassung/buchhaltung/types";
import BuchhaltungTableHead from "@/pages/zeiterfassung/buchhaltung/BuchhaltungTableHead";
import BuchhaltungDeptHeader from "@/pages/zeiterfassung/buchhaltung/BuchhaltungDeptHeader";
import BuchhaltungRow from "@/pages/zeiterfassung/buchhaltung/BuchhaltungRow";
import BuchhaltungFooter from "@/pages/zeiterfassung/buchhaltung/BuchhaltungFooter";
import { useSfnMode, type SfnMode } from "@/hooks/useSfnMode";
import { effectiveEveningHours, effectiveNightHours } from "@/lib/shiftCalculations";
import EmployeeSearchFilter, { filterEmployeesBySearch } from "@/components/zeiterfassung/EmployeeSearchFilter";
import RestaurantBadge from "@/components/zeiterfassung/RestaurantBadge";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type SharedPeriod = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  restaurant_name: string;
};

type WaiterShiftEntry = {
  staff_id: string | null;
  waiter_name: string;
  second_waiter_name: string | null;
  additional_waiters: string[];
  pos_sales: number;
  hours_worked: number | null;
  session_date: string;
  restaurant_id: string;
};

type StaffRoleEntry = {
  id: string;
  role: string;
  name: string;
  nickname: string | null;
};

type CumulatedData = {
  period: { label: string; start_date: string; end_date: string; status: string };
  weeks: any[];
  allWeekIds: string[];
  weekNumberToAllIds: Record<number, string[]>;
  weekToRestaurant: Record<string, string>;
  shifts: Shift[];
  employees: any[];
  payrollNotes: PayrollNote[];
  advances: AdvanceEntry[];
  holidays: { holiday_date: string; name: string; surcharge_rate?: number }[];
  matchingPeriods: { id: string; label: string; restaurant_name: string; restaurant_id: string }[];
  waiterShifts?: WaiterShiftEntry[];
  staffRoles?: StaffRoleEntry[];
  commissionSettings?: Record<string, { minRevenue: number; pct: number }>;
};

export default function PayrollPortal() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("payroll_pin") ?? "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = 'YUM Gastronomie GmbH Arbeitszeiterfassung';
    return () => { document.title = prev; };
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState<{ start_date: string; end_date: string; label: string } | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check if we have a stored valid pin
  useEffect(() => {
    if (pin && !isAuthenticated) {
      handleAuth(pin);
    }
  }, []);

  const queryClient = useQueryClient();

  // Load periods after auth
  const { data: periods, isLoading: periodsLoading } = useQuery<SharedPeriod[]>({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("payroll_pin");
        throw new Error("Session abgelaufen");
      }
      const data = await res.json();
      return data.periods;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Load cumulated data for selected period
  const { data: cumulatedData, isLoading: dataLoading } = useQuery<CumulatedData>({
    queryKey: ["payroll-data", selectedPeriod?.start_date, selectedPeriod?.end_date],
    queryFn: async () => {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin, period_start_date: selectedPeriod!.start_date, period_end_date: selectedPeriod!.end_date }),
      });
      if (!res.ok) throw new Error("Fehler beim Laden");
      return res.json();
    },
    enabled: isAuthenticated && !!selectedPeriod,
    refetchInterval: 30_000,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Group periods by date range (must be before early returns)
  const groupedPeriods = useMemo(() => {
    if (!periods) return [];
    const groups: Record<string, SharedPeriod[]> = {};
    periods.forEach(p => {
      const key = `${p.start_date}_${p.end_date}`;
      (groups[key] ??= []).push(p);
    });
    return Object.entries(groups).map(([key, items]) => ({
      key,
      label: items[0].label,
      start_date: items[0].start_date,
      end_date: items[0].end_date,
      restaurants: items.map(i => i.restaurant_name),
      status: items.every(i => i.status === "locked") ? "locked" : "open",
    }));
  }, [periods]);

  async function handleAuth(pinCode: string) {
    setIsAuthenticating(true);
    setPinError("");
    try {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin: pinCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Falscher PIN");
        sessionStorage.removeItem("payroll_pin");
        return;
      }
      setPin(pinCode);
      sessionStorage.setItem("payroll_pin", pinCode);
      setIsAuthenticated(true);
    } catch {
      setPinError("Verbindungsfehler");
    } finally {
      setIsAuthenticating(false);
    }
  }

  // --- PIN Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Sonner />
        <Card className="w-full max-w-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Lohnbüro Portal</h1>
            <p className="text-sm text-muted-foreground">Bitte PIN eingeben</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAuth(pinInput); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN-Code</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
            <Button type="submit" className="w-full" disabled={pinInput.length < 4 || isAuthenticating}>
              {isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Anmelden
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // --- Period Detail View ---
  if (selectedPeriod) {
    if (dataLoading || !cumulatedData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Sonner />
        <CumulatedView
          data={cumulatedData}
          pin={pin}
          onBack={() => setSelectedPeriod(null)}
          queryClient={queryClient}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sonner />
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lohnbüro Portal</h1>
            <p className="text-sm text-muted-foreground">Freigegebene Perioden — alle Restaurants</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem("payroll_pin"); setPinInput(""); }}>
            Abmelden
          </Button>
        </div>

        {periodsLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!periodsLoading && groupedPeriods.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Keine freigegebenen Perioden vorhanden.
          </Card>
        )}

        <div className="grid gap-3">
          {groupedPeriods.map(group => (
            <Card
              key={group.key}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedPeriod({ start_date: group.start_date, end_date: group.end_date, label: group.label })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{group.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(group.start_date), "dd.MM.yyyy", { locale: de })} — {format(parseISO(group.end_date), "dd.MM.yyyy", { locale: de })}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {group.restaurants.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={group.status === "open" ? "default" : "secondary"}>
                  {group.status === "open" ? "Offen" : "Gesperrt"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Cumulated View (reuses SharedZtView patterns)
// =====================================================

function CumulatedView({ data, pin, onBack, queryClient }: {
  data: CumulatedData;
  pin: string;
  onBack: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [activeTab, setActiveTab] = useState("wochenplan");
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [staffDetailEmployee, setStaffDetailEmployee] = useState<any | null>(null);
  const { sfnMode, setSfnMode } = useSfnMode();

  // Commission data for Buchhaltung tab
  const firstRestaurantId = data.matchingPeriods[0]?.restaurant_id;
  const { data: commissionSetting } = useQuery({
    queryKey: ["settings", "commission_add_to_gross", firstRestaurantId],
    queryFn: async () => {
      if (!firstRestaurantId) return false;
      const { data: d } = await supabase.from("settings").select("value").eq("key", "commission_add_to_gross").eq("restaurant_id", firstRestaurantId).maybeSingle();
      return (d?.value as any)?.enabled ?? false;
    },
    enabled: !!firstRestaurantId,
  });
  const showCommission = commissionSetting === true;

  const { commissionMap, totalCommission: commTotalUnused } = useCommissionData(firstRestaurantId, data.period.start_date, data.period.end_date);

  const { period, weeks, shifts, employees, payrollNotes, advances, holidays, weekNumberToAllIds, weekToRestaurant, matchingPeriods } = data;
  const holidayMap = new Map(holidays.map(h => [h.holiday_date, h.name]));
  const holidayRates = useMemo(() => {
    const map = new Map<string, number>();
    holidays.forEach(h => { if (h.surcharge_rate != null) map.set(h.holiday_date, h.surcharge_rate); });
    return map;
  }, [holidays]);
  const hasMultipleRestaurants = matchingPeriods.length > 1;

  // Unique restaurants from matchingPeriods
  const restaurants = useMemo(() => {
    const seen = new Map<string, string>();
    matchingPeriods.forEach(p => { if (!seen.has(p.restaurant_id)) seen.set(p.restaurant_id, p.restaurant_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [matchingPeriods]);

  // Map restaurant_id to restaurant_name for employees
  const restaurantIdToName = useMemo(() => {
    const map = new Map<string, string>();
    matchingPeriods.forEach(p => map.set(p.restaurant_id, p.restaurant_name));
    return map;
  }, [matchingPeriods]);

  useEffect(() => {
    if (weeks?.length && !selectedWeekId) setSelectedWeekId(weeks[0].id);
  }, [weeks, selectedWeekId]);

  // Filtering logic
  const effectiveRestaurant = hasMultipleRestaurants ? selectedRestaurant : "all";

  // Identify employees working in both Küche and Service
  const dualDeptIds = useMemo(() => {
    const deptsByEmp = new Map<string, Set<string>>();
    employees.forEach((e: any) => {
      if (!deptsByEmp.has(e.id)) deptsByEmp.set(e.id, new Set());
      deptsByEmp.get(e.id)!.add(e.department);
    });
    return new Set(
      Array.from(deptsByEmp.entries())
        .filter(([, depts]) => depts.has("Küche") && depts.has("Service"))
        .map(([id]) => id)
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const enriched = employees.map((e: any) => ({
      ...e,
      restaurant_name: e.restaurant_name ?? restaurantIdToName.get(e.restaurant_id) ?? undefined,
    }));
    if (effectiveRestaurant === "all") {
      // Deduplicate by id+department for cumulated view
      const seen = new Set<string>();
      return enriched.filter((e: any) => {
        const key = `${e.id}-${e.department}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return enriched.filter((e: any) => e.restaurant_id === effectiveRestaurant);
  }, [employees, effectiveRestaurant, restaurantIdToName]);

  const filteredShifts = useMemo(() => {
    if (effectiveRestaurant === "all") return shifts;
    const empIds = new Set(filteredEmployees.map((e: any) => e.id));
    const restaurantWeekIds = new Set(
      Object.entries(weekToRestaurant)
        .filter(([, rid]) => rid === effectiveRestaurant)
        .map(([wid]) => wid)
    );
    return shifts.filter(s => empIds.has(s.employee_id) && restaurantWeekIds.has(s.week_id));
  }, [shifts, effectiveRestaurant, filteredEmployees, weekToRestaurant]);



  const filteredAdvances = useMemo(() => {
    if (effectiveRestaurant === "all") return advances;
    return advances.filter((a: any) => a.restaurant_id === effectiveRestaurant);
  }, [advances, effectiveRestaurant]);

  const filteredPayrollNotes = useMemo(() => {
    if (effectiveRestaurant === "all") return payrollNotes;
    const periodIds = new Set(matchingPeriods.filter(p => p.restaurant_id === effectiveRestaurant).map(p => p.id));
    return payrollNotes.filter(n => periodIds.has(n.period_id));
  }, [payrollNotes, effectiveRestaurant, matchingPeriods]);

  const effectiveWeekNumberToAllIds = useMemo(() => {
    if (effectiveRestaurant === "all") return weekNumberToAllIds;
    const filtered: Record<number, string[]> = {};
    for (const [num, ids] of Object.entries(weekNumberToAllIds)) {
      filtered[Number(num)] = ids.filter(id => weekToRestaurant[id] === effectiveRestaurant);
    }
    return filtered;
  }, [weekNumberToAllIds, effectiveRestaurant, weekToRestaurant]);

  // Effective period status
  const effectiveStatus = useMemo(() => {
    if (effectiveRestaurant === "all") return period.status;
    const relevant = matchingPeriods.filter(p => p.restaurant_id === effectiveRestaurant);
    // We don't have status per period in matchingPeriods, use overall
    return period.status;
  }, [effectiveRestaurant, matchingPeriods, period.status]);

  const sortedEmployees = useMemo(() => [...filteredEmployees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  }), [filteredEmployees]);

  // O(1) lookup instead of O(n²) .some() per employee
  const shiftEmployeeLookup = useMemo(() => {
    const set = new Set<string>();
    filteredShifts.forEach((s) => {
      if (Number(s.total_hours) > 0 || !!s.absence_type) {
        set.add(`${s.employee_id}-${s.department}`);
      }
    });
    return set;
  }, [filteredShifts]);

  const employeesWithShifts = sortedEmployees.filter((emp) =>
    shiftEmployeeLookup.has(`${emp.id}-${emp.department}`)
  );

  const isLocked = effectiveStatus === "locked";

  const upsertNote = useMutation({
    mutationFn: async (params: { employee_id: string; field: string; value: any }) => {
      const periodIds = matchingPeriods.map(p => p.id);
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin, action: "upsert_note", ...params, period_ids: periodIds }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-data"] });
      toast.success("Gespeichert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const updateStaff = useMutation({
    mutationFn: async (params: { staff_id: string; updates: Record<string, any> }) => {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin, action: "update_staff", ...params }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-data"] });
      toast.success("Mitarbeiterdaten gespeichert");
      setStaffDetailEmployee(null);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const handleEmployeeClick = useCallback((empId: string) => {
    // Find unique employee data (take first occurrence regardless of department)
    const emp = employees.find(e => e.id === empId);
    if (emp) setStaffDetailEmployee(emp);
  }, [employees]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Zeiterfassung — {period.label}</h1>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(period.start_date), "dd.MM.yyyy", { locale: de })} — {format(parseISO(period.end_date), "dd.MM.yyyy", { locale: de })}
              {matchingPeriods.length > 0 && (
                <span className="ml-2">
                  ({matchingPeriods.map(p => p.restaurant_name).join(", ")})
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge variant={isLocked ? "secondary" : "default"}>
          {isLocked ? "Gesperrt" : "Offen"}
        </Badge>
      </div>

      {hasMultipleRestaurants && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedRestaurant === "all" ? "default" : "outline"}
            onClick={() => setSelectedRestaurant("all")}
          >
            Alle
          </Button>
          {restaurants.map(r => (
            <Button
              key={r.id}
              size="sm"
              variant={selectedRestaurant === r.id ? "default" : "outline"}
              onClick={() => setSelectedRestaurant(r.id)}
            >
              {r.name}
            </Button>
          ))}
        </div>
      )}

      {(activeTab === "zusammenfassung" || activeTab === "buchhaltung") && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant={sfnMode === "simple" ? "default" : "outline"} onClick={() => setSfnMode("simple")}>Einfach</Button>
          <Button size="sm" variant={sfnMode === "extended" ? "default" : "outline"} onClick={() => setSfnMode("extended")}>§3b EStG</Button>
        </div>
      )}

      {activeTab !== "provision" && <EmployeeSearchFilter value={searchTerm} onChange={setSearchTerm} />}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchTerm(""); }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="wochenplan">Wochenplan</TabsTrigger>
          <TabsTrigger value="zusammenfassung">Zusammenfassung</TabsTrigger>
          <TabsTrigger value="buchhaltung">Buchhaltung</TabsTrigger>
          <TabsTrigger value="provision">Provision</TabsTrigger>
        </TabsList>

        <TabsContent value="wochenplan">
          <PayrollWochenplanTab
            weeks={weeks}
            shifts={filteredShifts}
            employees={filterEmployeesBySearch(sortedEmployees, searchTerm)}
            holidays={holidayMap}
            periodLabel={period.label}
            selectedWeekId={selectedWeekId}
            onSelectWeek={setSelectedWeekId}
            isLocked={isLocked}
            pin={pin}
            weekNumberToAllIds={effectiveWeekNumberToAllIds}
            onShiftsChanged={() => queryClient.invalidateQueries({ queryKey: ["payroll-data"] })}
            searchTerm={searchTerm}
            onEmployeeClick={handleEmployeeClick}
            weekToRestaurant={effectiveRestaurant === "all" ? weekToRestaurant : undefined}
          />
        </TabsContent>

        <TabsContent value="zusammenfassung">
          <PayrollZusammenfassungTab
            key={`zus-${sfnMode}`}
            sfnMode={sfnMode}
            weeks={weeks}
            shifts={filteredShifts}
            employees={filterEmployeesBySearch(employeesWithShifts, searchTerm)}
            periodLabel={period.label}
            weekNumberToAllIds={effectiveWeekNumberToAllIds}
            searchTerm={searchTerm}
            onEmployeeClick={handleEmployeeClick}
            weekToRestaurant={effectiveRestaurant === "all" ? weekToRestaurant : undefined}
            dualDeptIds={dualDeptIds}
          />
        </TabsContent>

        <TabsContent value="buchhaltung">
          <PayrollBuchhaltungTab
            key={`buch-${sfnMode}`}
            shifts={filteredShifts}
            employees={filterEmployeesBySearch(employeesWithShifts, searchTerm)}
            payrollNotes={filteredPayrollNotes}
            advances={filteredAdvances}
            periodLabel={period.label}
            isLocked={isLocked}
            onUpsertNote={(p) => upsertNote.mutate(p)}
            sfnMode={sfnMode}
            holidayRates={holidayRates}
            showCommission={showCommission}
            commissionMap={showCommission ? commissionMap : undefined}
            searchTerm={searchTerm}
            onEmployeeClick={handleEmployeeClick}
            weekToRestaurant={effectiveRestaurant === "all" ? weekToRestaurant : undefined}
            dualDeptIds={dualDeptIds}
          />
        </TabsContent>

        <TabsContent value="provision">
          <PayrollProvisionTab
            waiterShifts={data.waiterShifts ?? []}
            staffRoles={data.staffRoles ?? []}
            commissionSettings={data.commissionSettings ?? {}}
            shifts={filteredShifts}
            employees={filteredEmployees}
            restaurants={restaurants}
            selectedRestaurant={effectiveRestaurant}
            periodStartDate={period.start_date}
            periodEndDate={period.end_date}
          />
        </TabsContent>
      </Tabs>

      <StaffDetailDialog
        employee={staffDetailEmployee}
        onClose={() => setStaffDetailEmployee(null)}
        onSave={(updates) => {
          if (staffDetailEmployee) {
            updateStaff.mutate({ staff_id: staffDetailEmployee.id, updates });
          }
        }}
        isSaving={updateStaff.isPending}
      />
    </div>
  );
}

// =================== Helper functions ===================

function formatTimeInput(value: string): string {
  if (!value.trim()) return "";
  if (/^\d{1,2}$/.test(value)) return value.padStart(2, "0") + ":00";
  if (/^\d{4}$/.test(value)) return value.slice(0, 2) + ":" + value.slice(2);
  const m = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2].padEnd(2, "0");
  return value;
}

function handleTimeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); return; }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  const el = e.currentTarget;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const atEdge = e.key === "ArrowLeft" ? el.selectionStart === 0 : el.selectionEnd === el.value.length;
    if (!atEdge) return;
  }
  e.preventDefault();
  const allFields = Array.from(document.querySelectorAll<HTMLInputElement>('[data-time-field]'));
  const idx = allFields.indexOf(el);
  if (idx === -1) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const col = el.dataset.timeCol;
    const sameCol = allFields.filter(f => f.dataset.timeCol === col);
    const colIdx = sameCol.indexOf(el);
    const nextColIdx = e.key === "ArrowDown" ? colIdx + 1 : colIdx - 1;
    if (nextColIdx >= 0 && nextColIdx < sameCol.length) { sameCol[nextColIdx].focus(); sameCol[nextColIdx].select(); }
    return;
  }
  const target = e.key === "ArrowRight" ? idx + 1 : idx - 1;
  if (target >= 0 && target < allFields.length) { allFields[target].focus(); allFields[target].select(); }
}

// =================== Wochenplan Tab ===================

function PayrollWochenplanTab({ weeks, shifts, employees, holidays, periodLabel, selectedWeekId, onSelectWeek, isLocked, pin, weekNumberToAllIds, onShiftsChanged, searchTerm = "", onEmployeeClick, weekToRestaurant }: {
  weeks: any[];
  shifts: Shift[];
  employees: any[];
  holidays: Map<string, string>;
  periodLabel: string;
  selectedWeekId: string;
  onSelectWeek: (id: string) => void;
  isLocked: boolean;
  pin: string;
  weekNumberToAllIds: Record<number, string[]>;
  onShiftsChanged: () => void;
  searchTerm?: string;
  onEmployeeClick?: (empId: string) => void;
  weekToRestaurant?: Record<string, string>;
}) {
  const [editingTime, setEditingTime] = useState<Record<string, string>>({});
  const [absenceDialog, setAbsenceDialog] = useState<{
    open: boolean; employeeId: string; employeeName: string; absenceType: 'urlaub' | 'krank';
    startDate: Date; endDate: Date | undefined; department: string;
  }>({ open: false, employeeId: "", employeeName: "", absenceType: "urlaub", startDate: new Date(), endDate: undefined, department: "" });

  const selectedWeek = weeks.find(w => w.id === selectedWeekId);
  const weekDays = selectedWeek
    ? eachDayOfInterval({
        start: startOfWeek(parseISO(selectedWeek.start_date), { weekStartsOn: 1 }),
        end: endOfWeek(parseISO(selectedWeek.start_date), { weekStartsOn: 1 }),
      })
    : [];
  const activeDates = selectedWeek
    ? new Set(eachDayOfInterval({ start: parseISO(selectedWeek.start_date), end: parseISO(selectedWeek.end_date) }).map(d => format(d, "yyyy-MM-dd")))
    : new Set<string>();

  // For cumulated view: collect all week IDs that match the selected week's week_number
  const selectedWeekNumber = selectedWeek?.week_number;
  const relevantWeekIds = selectedWeekNumber != null ? (weekNumberToAllIds[selectedWeekNumber] ?? [selectedWeekId]) : [selectedWeekId];
  const weekShifts = shifts.filter(s => relevantWeekIds.includes(s.week_id));

  const upsertShift = useMutation({
    mutationFn: async (params: {
      employee_id: string; week_id: string; shift_date: string;
      start_time: string | null; end_time: string | null;
      absence_type?: string | null; department?: string; field?: string;
    }) => {
      const res = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/payroll-office-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ pin, action: "upsert_shift", ...params }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Fehler"); }
    },
    onSuccess: () => onShiftsChanged(),
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const getShift = useCallback(
    (employeeId: string, date: string, department?: string) =>
      weekShifts.find(s => s.employee_id === employeeId && s.shift_date === date && (!department || s.department === department)),
    [weekShifts]
  );

  const handleTimeChange = (employeeId: string, date: string, field: "start_time" | "end_time", value: string, department?: string) => {
    // Use the first relevant weekId for upserting
    const targetWeekId = relevantWeekIds[0] || selectedWeekId;
    upsertShift.mutate({
      employee_id: employeeId, week_id: targetWeekId, shift_date: date,
      start_time: field === "start_time" ? (value || null) : null,
      end_time: field === "end_time" ? (value || null) : null,
      department: department ?? "", field,
    });
  };

  const openAbsenceDialog = (employeeId: string, date: string, absenceType: 'urlaub' | 'krank', department?: string) => {
    const emp = employees.find(e => e.id === employeeId);
    setAbsenceDialog({
      open: true, employeeId,
      employeeName: emp ? ([emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name) : "",
      absenceType, startDate: parseISO(date), endDate: undefined, department: department ?? "",
    });
  };

  const handleAbsenceRange = () => {
    const { employeeId, absenceType, startDate, endDate, department } = absenceDialog;
    const rangeEnd = endDate || startDate;
    const days = eachDayOfInterval({ start: startDate, end: rangeEnd });
    let skipped = 0;
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const week = weeks.find(w => isWithinInterval(day, { start: parseISO(w.start_date), end: parseISO(w.end_date) }));
      if (!week) { skipped++; continue; }
      upsertShift.mutate({
        employee_id: employeeId, week_id: week.id, shift_date: dateStr,
        start_time: null, end_time: null, absence_type: absenceType, department,
      });
    }
    if (skipped > 0) toast.warning(`${skipped} Tag(e) lagen außerhalb der Periode.`);
    toast.success(`${absenceType === 'urlaub' ? 'Urlaub' : 'Krank'} für ${days.length - skipped} Tag(e) eingetragen.`);
    setAbsenceDialog(prev => ({ ...prev, open: false }));
  };

  const handleAbsenceToggle = (employeeId: string, date: string, absenceType: string | null, department?: string) => {
    const targetWeekId = relevantWeekIds[0] || selectedWeekId;
    upsertShift.mutate({
      employee_id: employeeId, week_id: targetWeekId, shift_date: date,
      start_time: null, end_time: null, absence_type: absenceType, department: department ?? "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {weeks.map(w => (
            <Button key={w.id} variant={w.id === selectedWeekId ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectWeek(w.id)}>
              W{w.week_number}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!shifts.length} onClick={() => exportWochenplanPdf(periodLabel, employees, weeks, shifts as any, holidays)}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!shifts.length} onClick={() => exportWochenplanExcel(periodLabel, employees, weeks, shifts as any, holidays)}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!shifts.length} onClick={() => { exportWochenplanCsv(periodLabel, employees, weeks, shifts as any, holidays); toast.success("CSV erstellt"); }}>
            <FileDown className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {selectedWeek && weekDays.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-1.5 font-semibold min-w-[140px] border-b text-xs" />
                {weekDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isHol = holidays.has(dateStr);
                  const isSun = isSunday(day);
                  return (
                    <th key={dateStr} colSpan={2} className={`text-center p-1.5 font-semibold min-w-[120px] border-b text-xs ${!activeDates.has(dateStr) ? "opacity-40" : ""} ${isHol || isSun ? "text-destructive" : ""}`}>
                      {format(day, "EE dd.MM.", { locale: de })}
                      {isHol && <span className="block text-[10px]">{holidays.get(dateStr)}</span>}
                    </th>
                  );
                })}
                <th className="text-center p-1.5 font-semibold border-b text-xs min-w-[50px]">Σ</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastDept = "";
                let zebraIdx = 0;
                return employees.map(emp => {
                  const empWeekShifts = weekShifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
                  const weekTotal = empWeekShifts.reduce((sum, s) => sum + Number(s.total_hours), 0);
                  const showDeptHeader = emp.department !== lastDept;
                  if (showDeptHeader) { lastDept = emp.department; zebraIdx = 0; }
                  const isEven = zebraIdx % 2 === 1;
                  zebraIdx++;
                  const deptColor = emp.department === "Küche" ? "hsl(15 80% 50%)" : emp.department === "GL" ? "hsl(220 60% 50%)" : "hsl(145 60% 40%)";

                  return (
                    <React.Fragment key={`${emp.id}-${emp.department}`}>
                      {showDeptHeader && (
                        <tr className={`dept-header-row ${getDepartmentBgClass(emp.department)}`}>
                          <td colSpan={weekDays.length * 2 + 2} className="px-2 py-1 text-xs font-bold tracking-wide border-l-4" style={{ borderLeftColor: deptColor }}>
                            {emp.department}
                          </td>
                        </tr>
                      )}
                      <tr className={`border-t hover:bg-muted/30 ${isEven ? "bg-muted/20" : ""}`}>
                        <td className="p-1.5 font-medium text-xs whitespace-nowrap border-l-2" style={{ borderLeftColor: deptColor }}>
                          <span className="cursor-pointer hover:underline" onClick={() => onEmployeeClick?.(emp.id)}>
                            {emp.nickname || emp.first_name || emp.name}
                          </span>
                          <RestaurantBadge restaurantName={emp.restaurant_name} department={emp.department} show={!!searchTerm} />
                        </td>
                        {weekDays.map(day => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const shift = empWeekShifts.find(s => s.shift_date === dateStr);
                          const isActive = activeDates.has(dateStr);
                          if (!isActive) return <td key={dateStr} colSpan={2} className="opacity-40" />;

                          const absenceType = shift?.absence_type as string | null;
                          const startVal = shift?.start_time?.slice(0, 5) ?? "";
                          const endVal = shift?.end_time?.slice(0, 5) ?? "";

                          if (absenceType) {
                            return (
                              <td key={dateStr} colSpan={2} className="p-0.5 text-center">
                                <button
                                  className={`inline-flex items-center justify-center h-7 w-full rounded text-xs font-bold cursor-pointer ${
                                    absenceType === 'urlaub'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}
                                  onClick={() => !isLocked && handleAbsenceToggle(emp.id, dateStr, null, emp.department)}
                                  disabled={isLocked}
                                  title={absenceType === 'urlaub' ? 'Urlaub — klicken zum Entfernen' : 'Krank — klicken zum Entfernen'}
                                >
                                  {absenceType === 'urlaub' ? 'U' : 'K'}
                                </button>
                              </td>
                            );
                          }

                          return (
                            <React.Fragment key={dateStr}>
                              <td className="p-0.5">
                                <div className="relative flex items-center">
                                  <Input
                                    type="text"
                                    className="h-7 text-xs px-1 w-[72px] text-center time-input-clean"
                                    placeholder=""
                                    data-time-field={`${emp.id}-${dateStr}-start_time`}
                                    data-time-col={`${dateStr}-start_time`}
                                    value={editingTime[`${emp.id}-${dateStr}-start_time`] ?? startVal}
                                    onChange={(e) => setEditingTime(prev => ({ ...prev, [`${emp.id}-${dateStr}-start_time`]: e.target.value }))}
                                    onBlur={(e) => {
                                      const key = `${emp.id}-${dateStr}-start_time`;
                                      const raw = e.target.value;
                                      const formatted = formatTimeInput(raw);
                                      if (formatted) handleTimeChange(emp.id, dateStr, "start_time", formatted, emp.department);
                                      else if (!raw.trim() && startVal) handleTimeChange(emp.id, dateStr, "start_time", "", emp.department);
                                      setEditingTime(prev => { const next = { ...prev }; delete next[key]; return next; });
                                    }}
                                    onKeyDown={handleTimeKeyDown}
                                    onFocus={(e) => e.target.select()}
                                    disabled={isLocked}
                                  />
                                  {!isLocked && !startVal && !endVal && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="absolute -right-1 top-0 h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs" tabIndex={-1}>⋮</button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => openAbsenceDialog(emp.id, dateStr, 'urlaub', emp.department)}>
                                          <span className="text-green-600 font-bold mr-2">U</span> Urlaub
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openAbsenceDialog(emp.id, dateStr, 'krank', emp.department)}>
                                          <span className="text-red-600 font-bold mr-2">K</span> Krank
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                              <td className="p-0.5">
                                <Input
                                  type="text"
                                  className="h-7 text-xs px-1 w-[72px] text-center time-input-clean"
                                  placeholder=""
                                  data-time-field={`${emp.id}-${dateStr}-end_time`}
                                  data-time-col={`${dateStr}-end_time`}
                                  value={editingTime[`${emp.id}-${dateStr}-end_time`] ?? endVal}
                                  onChange={(e) => setEditingTime(prev => ({ ...prev, [`${emp.id}-${dateStr}-end_time`]: e.target.value }))}
                                  onBlur={(e) => {
                                    const key = `${emp.id}-${dateStr}-end_time`;
                                    const raw = e.target.value;
                                    const formatted = formatTimeInput(raw);
                                    if (formatted) handleTimeChange(emp.id, dateStr, "end_time", formatted, emp.department);
                                    else if (!raw.trim() && endVal) handleTimeChange(emp.id, dateStr, "end_time", "", emp.department);
                                    setEditingTime(prev => { const next = { ...prev }; delete next[key]; return next; });
                                  }}
                                  onKeyDown={handleTimeKeyDown}
                                  onFocus={(e) => e.target.select()}
                                  disabled={isLocked}
                                />
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="text-center p-1.5 font-medium text-xs">{weekTotal > 0 ? formatHours(weekTotal) : ""}</td>
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={absenceDialog.open} onOpenChange={(open) => setAbsenceDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{absenceDialog.absenceType === 'urlaub' ? 'Urlaub' : 'Krankheit'} eintragen</DialogTitle>
            <DialogDescription>{absenceDialog.employeeName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Von</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(absenceDialog.startDate, "dd.MM.yyyy", { locale: de })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={absenceDialog.startDate} onSelect={(d) => d && setAbsenceDialog(prev => ({ ...prev, startDate: d }))} locale={de} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bis <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !absenceDialog.endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {absenceDialog.endDate ? format(absenceDialog.endDate, "dd.MM.yyyy", { locale: de }) : "Kein Enddatum (nur 1 Tag)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={absenceDialog.endDate} onSelect={(d) => setAbsenceDialog(prev => ({ ...prev, endDate: d || undefined }))} locale={de} disabled={(d) => d < absenceDialog.startDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceDialog(prev => ({ ...prev, open: false }))}>Abbrechen</Button>
            <Button onClick={handleAbsenceRange}>Eintragen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== Zusammenfassung Tab ===================

function PayrollZusammenfassungTab({ sfnMode, weeks, shifts, employees, periodLabel, weekNumberToAllIds, searchTerm = "", onEmployeeClick, weekToRestaurant, dualDeptIds }: {
  sfnMode: SfnMode;
  weeks: any[];
  shifts: Shift[];
  employees: any[];
  periodLabel: string;
  weekNumberToAllIds: Record<number, string[]>;
  searchTerm?: string;
  onEmployeeClick?: (empId: string) => void;
  weekToRestaurant?: Record<string, string>;
  dualDeptIds?: Set<string>;
}) {
  const additive = sfnMode === "extended";
  const isExtended = sfnMode === "extended";

  // Scope shifts to a specific employee's restaurant (for "Alle" mode)
  const scopeShifts = useCallback((empId: string, department?: string) => {
    return shifts.filter(sh => sh.employee_id === empId && (!department || sh.department === department));
  }, [shifts]);

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weekNumberToAllIds[weekNumber] ?? weeks.filter(w => w.week_number === weekNumber).map(w => w.id);
    return shifts.filter(s => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department))
      .reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  const getEmpTotals = (empId: string, department?: string) => {
    const empShifts = scopeShifts(empId, department);
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      sonntagStunden: empShifts.filter(s => !s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      feiertagStunden: empShifts.filter(s => s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s, additive), 0),
      night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s, additive), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{isExtended ? "§3b EStG (erweitert)" : "Einfach"}</Badge>
        <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungPdf(periodLabel, employees, weeks, shifts as any, weekNumberToAllIds)}>
          <FileDown className="mr-1 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungExcel(periodLabel, employees, weeks, shifts as any, weekNumberToAllIds)}>
          <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
        </Button>
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportZusammenfassungCsv(periodLabel, employees, weeks, shifts as any, weekNumberToAllIds); toast.success("CSV erstellt"); }}>
          <FileDown className="mr-1 h-4 w-4" /> CSV
        </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 font-medium">Mitarbeiter</th>
              {weeks.map(w => <th key={w.id} className="text-center p-2 font-medium whitespace-nowrap">W{w.week_number}</th>)}
              <th className="text-center p-2 font-medium">Gesamt</th>
              <th className="text-center p-2 font-medium">Schichten</th>
               <th className="text-center p-2 font-medium"><SfnTooltipHeader column="evening" label="20-24" sfnMode={sfnMode} /></th>
               <th className="text-center p-2 font-medium"><SfnTooltipHeader column="night" label="24-x" sfnMode={sfnMode} /></th>
               {isExtended ? (
                 <>
                   <th className="text-center p-2 font-medium"><SfnTooltipHeader column="sonntag" label="So" sfnMode={sfnMode} /></th>
                   <th className="text-center p-2 font-medium"><SfnTooltipHeader column="feiertag" label="Fei" sfnMode={sfnMode} /></th>
                 </>
               ) : (
                 <th className="text-center p-2 font-medium"><SfnTooltipHeader column="soFei" label="So/Fei" sfnMode={sfnMode} /></th>
               )}
              <th className="text-center p-2 font-medium">U</th>
              <th className="text-center p-2 font-medium">K</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => {
              const prevDept = idx > 0 ? employees[idx - 1].department : null;
              const showDeptHeader = emp.department !== prevDept;
              const totals = getEmpTotals(emp.id, emp.department);

              return (
                <React.Fragment key={`${emp.id}-${emp.department}`}>
                   {showDeptHeader && !searchTerm.trim() && (
                    <tr>
                      <td colSpan={weeks.length + (isExtended ? 9 : 8)} className={`p-2 font-bold text-xs uppercase tracking-wide ${getDepartmentBgClass(emp.department)}`}>
                        {emp.department}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium">
                      <span className="cursor-pointer hover:underline" onClick={() => onEmployeeClick?.(emp.id)}>
                      {(() => {
                        const nicknameAlreadyInName = emp.nickname && (emp.first_name?.includes(emp.nickname) || emp.last_name?.includes(emp.nickname));
                        return emp.first_name || emp.last_name
                          ? [emp.first_name, emp.nickname && !nicknameAlreadyInName ? `(${emp.nickname})` : null, emp.last_name].filter(Boolean).join(" ")
                          : emp.name;
                      })()}
                      </span>
                      {emp.perso_nr && emp.perso_nr > 0 && <span className="text-xs text-muted-foreground ml-1">{emp.perso_nr}</span>}
                      <RestaurantBadge restaurantName={emp.restaurant_name} department={emp.department} show={!!searchTerm.trim()} />
                      {dualDeptIds?.has(emp.id) && <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100" variant="outline">K+S</Badge>}
                    </td>
                    {weeks.map(w => {
                      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
                      return <td key={w.id} className="text-center p-2">{h > 0 ? formatHours(h) : ""}</td>;
                    })}
                    <td className="text-center p-2 font-medium">{formatHours(totals.gesamt)}</td>
                    <td className="text-center p-2">{totals.schichten || ""}</td>
                     <td className="text-center p-2">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                     <td className="text-center p-2">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
                     {isExtended ? (
                       <>
                         <td className="text-center p-2">{totals.sonntagStunden > 0 ? formatHours(totals.sonntagStunden) : ""}</td>
                         <td className="text-center p-2">{totals.feiertagStunden > 0 ? formatHours(totals.feiertagStunden) : ""}</td>
                       </>
                     ) : (
                       <td className="text-center p-2">{totals.soFeiStunden > 0 ? formatHours(totals.soFeiStunden) : ""}</td>
                     )}
                    <td className="text-center p-2 text-green-600 font-medium">{totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace(".", ",") : ""}</td>
                    <td className="text-center p-2 text-red-600 font-medium">{totals.krankTage > 0 ? totals.krankTage : ""}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================== Buchhaltung Tab ===================

function PayrollBuchhaltungTab({ shifts, employees, payrollNotes, advances, periodLabel, isLocked, onUpsertNote, sfnMode = "simple", holidayRates, showCommission = false, commissionMap, searchTerm = "", onEmployeeClick, weekToRestaurant, dualDeptIds }: {
  shifts: Shift[];
  employees: any[];
  payrollNotes: PayrollNote[];
  advances: AdvanceEntry[];
  periodLabel: string;
  isLocked: boolean;
  onUpsertNote: (p: { employee_id: string; field: string; value: any }) => void;
  sfnMode?: SfnMode;
  holidayRates?: Map<string, number>;
  showCommission?: boolean;
  commissionMap?: Map<string, number>;
  searchTerm?: string;
  onEmployeeClick?: (empId: string) => void;
  weekToRestaurant?: Record<string, string>;
  dualDeptIds?: Set<string>;
}) {
  const additive = sfnMode === "extended";
  const isExtended = sfnMode === "extended";

  // Scope shifts to a specific employee's restaurant (for "Alle" mode)
  const scopeShiftsForEmp = useCallback((empId: string, department: string) => {
    return shifts.filter(sh => sh.employee_id === empId && sh.department === department);
  }, [shifts]);

  const advancesByName = useMemo(() => {
    const map: Record<string, AdvanceEntry[]> = {};
    advances.forEach(a => { (map[a.staff_name] ??= []).push(a); });
    return map;
  }, [advances]);

  const grandTotals = useMemo(() => {
    const t = { gesamt: 0, schichten: 0, soFeiStunden: 0, sonntagStunden: 0, feiertagStunden: 0, evening: 0, night: 0, urlaubTage: 0, krankTage: 0 };
    employees.forEach(emp => {
      const empShifts = scopeShiftsForEmp(emp.id, emp.department);
      const row = getEmployeeTotals(emp.id, empShifts as any, undefined, additive);
      t.gesamt += row.gesamt; t.schichten += row.schichten; t.soFeiStunden += row.soFeiStunden;
      t.sonntagStunden += row.sonntagStunden; t.feiertagStunden += row.feiertagStunden;
      t.evening += row.evening; t.night += row.night; t.urlaubTage += row.urlaubTage; t.krankTage += row.krankTage;
    });
    return t;
  }, [employees, scopeShiftsForEmp, additive]);

  const totalCommission = useMemo(() => {
    if (!commissionMap) return 0;
    let sum = 0;
    employees.forEach(emp => { if (emp.department === "Service") sum += commissionMap.get(emp.id) ?? 0; });
    return sum;
  }, [employees, commissionMap]);

  let zebraIdx = 0;
  let lastDept: string | null = null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">Modus: {sfnMode === "extended" ? "§3b EStG (erweitert)" : "Einfach"}</Badge>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportBuchhaltungPdf(periodLabel, employees, shifts, payrollNotes, sfnMode, holidayRates, showCommission ? commissionMap : undefined); toast.success("PDF erstellt"); }}>
            <FileDown className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportBuchhaltungExcel(periodLabel, employees, shifts, payrollNotes, sfnMode, holidayRates, showCommission ? commissionMap : undefined); toast.success("Excel erstellt"); }}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportBuchhaltungCsv(periodLabel, employees, shifts, payrollNotes, sfnMode, holidayRates, showCommission ? commissionMap : undefined); toast.success("CSV erstellt"); }}>
            <FileDown className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <BuchhaltungTableHead sfnMode={sfnMode} showCommission={showCommission} />
            <tbody>
              {employees.map(emp => {
                const showDeptHeader = emp.department !== lastDept;
                if (showDeptHeader) { zebraIdx = 0; lastDept = emp.department; }
                const isEven = zebraIdx % 2 === 1;
                zebraIdx++;

                const empShiftsScoped = scopeShiftsForEmp(emp.id, emp.department);
                const totals = getEmployeeTotals(emp.id, empShiftsScoped as any, undefined, additive);
                const note = payrollNotes.find(n => n.employee_id === emp.id);
                const empAdvances = advancesByName[emp.name] ?? [];

                return (
                  <React.Fragment key={`${emp.id}-${emp.department}`}>
                    {showDeptHeader && !searchTerm.trim() && <BuchhaltungDeptHeader department={emp.department} sfnMode={sfnMode} showCommission={showCommission} />}
                    <BuchhaltungRow
                      showRestaurantBadge={!!searchTerm.trim()}
                      emp={emp}
                      totals={totals}
                      note={note as PayrollNote | undefined}
                      shifts={empShiftsScoped as any}
                      advances={empAdvances}
                      isEven={isEven}
                      isLocked={isLocked}
                      sfnMode={sfnMode}
                      showCommission={showCommission}
                      commission={emp.department === "Service" ? (commissionMap?.get(emp.id) ?? 0) : 0}
                      onUpsertNote={onUpsertNote}
                      onEmployeeClick={onEmployeeClick}
                      isDualDepartment={dualDeptIds?.has(emp.id)}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
            {employees.length > 0 && !searchTerm.trim() && <BuchhaltungFooter grandTotals={grandTotals} sfnMode={sfnMode} showCommission={showCommission} totalCommission={totalCommission} />}
          </table>
        </div>
      </Card>
    </div>
  );
}

// =================== Provision Tab ===================

const GL_ROLES = new Set(["gl", "kitchen_gl"]);

function PayrollProvisionTab({ waiterShifts, staffRoles, commissionSettings, shifts, employees, restaurants, selectedRestaurant, periodStartDate, periodEndDate }: {
  waiterShifts: WaiterShiftEntry[];
  staffRoles: StaffRoleEntry[];
  commissionSettings: Record<string, { minRevenue: number; pct: number }>;
  shifts: Shift[];
  employees: any[];
  restaurants: { id: string; name: string }[];
  selectedRestaurant: string;
  periodStartDate: string;
  periodEndDate: string;
}) {
  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

  const effectiveSettings = useMemo(() => {
    const entries = Object.entries(commissionSettings);
    if (selectedRestaurant !== "all" && commissionSettings[selectedRestaurant]) {
      return commissionSettings[selectedRestaurant];
    }
    if (entries.length === 0) return { minRevenue: 1200, pct: 5 };
    return entries[0][1];
  }, [commissionSettings, selectedRestaurant]);

  const minRevenue = effectiveSettings.minRevenue;
  const commissionPct = effectiveSettings.pct;

  const glStaffIds = useMemo(() => new Set(staffRoles.filter(s => GL_ROLES.has(s.role)).map(s => s.id)), [staffRoles]);

  const staffNameToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staffRoles) {
      map.set(s.name.toLowerCase(), s.id);
      if (s.nickname) map.set(s.nickname.toLowerCase(), s.id);
    }
    return map;
  }, [staffRoles]);

  const isGlByName = useCallback((name: string) => {
    const id = staffNameToId.get(name.toLowerCase());
    return id ? glStaffIds.has(id) : false;
  }, [staffNameToId, glStaffIds]);

  const filteredWaiterShifts = useMemo(() => {
    let ws = waiterShifts;
    if (selectedRestaurant !== "all") ws = ws.filter(w => w.restaurant_id === selectedRestaurant);
    return ws.filter(w => !w.staff_id || !glStaffIds.has(w.staff_id));
  }, [waiterShifts, selectedRestaurant, glStaffIds]);

  const serviceEmployeeIds = useMemo(() => new Set(employees.filter(e => e.department === "Service").map(e => e.id)), [employees]);

  const { ztHoursByStaff, ztHoursByStaffDate } = useMemo(() => {
    const byStaff = new Map<string, number>();
    const byStaffDate = new Map<string, number>();
    for (const s of shifts) {
      if (s.department !== "Service" || !serviceEmployeeIds.has(s.employee_id)) continue;
      const h = Number(s.total_hours) || 0;
      if (h <= 0) continue;
      byStaff.set(s.employee_id, (byStaff.get(s.employee_id) ?? 0) + h);
      const key = `${s.employee_id}:${s.shift_date}`;
      byStaffDate.set(key, (byStaffDate.get(key) ?? 0) + h);
    }
    return { ztHoursByStaff: byStaff, ztHoursByStaffDate: byStaffDate };
  }, [shifts, serviceEmployeeIds]);

  const allDeptHoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shifts) {
      const h = Number(s.total_hours) || 0;
      if (h > 0) map.set(s.shift_date, (map.get(s.shift_date) ?? 0) + h);
    }
    return map;
  }, [shifts]);

  const dailyBreakdown = useMemo(() => {
    const dayMap = new Map<string, { staffSet: Set<string>; nameSet: Set<string>; waiterHours: number; revenue: number; staffIdsOnDate: Set<string> }>();
    for (const ws of filteredWaiterShifts) {
      const date = ws.session_date;
      if (!date) continue;
      const key = ws.staff_id || ws.waiter_name;
      if (!dayMap.has(date)) dayMap.set(date, { staffSet: new Set(), nameSet: new Set(), waiterHours: 0, revenue: 0, staffIdsOnDate: new Set() });
      const day = dayMap.get(date)!;
      if (!day.staffSet.has(key)) { day.staffSet.add(key); day.nameSet.add(ws.waiter_name); if (ws.staff_id) day.staffIdsOnDate.add(ws.staff_id); }
      day.waiterHours += Number(ws.hours_worked) || 0;
      day.revenue += Number(ws.pos_sales) || 0;
      const secondaries: string[] = [];
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) secondaries.push(ws.second_waiter_name);
      if (ws.additional_waiters?.length) for (const aw of ws.additional_waiters) if (aw && !isGlByName(aw)) secondaries.push(aw);
      for (const name of secondaries) {
        const sid = staffNameToId.get(name.toLowerCase());
        const sKey = sid || `secondary:${name}`;
        if (!day.staffSet.has(sKey)) { day.staffSet.add(sKey); day.nameSet.add(name); }
        if (sid) day.staffIdsOnDate.add(sid);
      }
    }
    return Array.from(dayMap.entries()).map(([date, d]) => {
      let ztTotal = 0, hasZt = false;
      for (const sid of d.staffIdsOnDate) { const h = ztHoursByStaffDate.get(`${sid}:${date}`); if (h != null) { ztTotal += h; hasZt = true; } }
      return { date, staffCount: d.staffSet.size, staffNames: Array.from(d.nameSet).sort(), hours: hasZt ? ztTotal : d.waiterHours, revenue: d.revenue, allDeptHours: allDeptHoursByDate.get(date) ?? 0 };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredWaiterShifts, isGlByName, ztHoursByStaffDate, staffNameToId, allDeptHoursByDate]);

  const aggregated = useMemo(() => {
    const map = new Map<string, { staffId: string | null; name: string; revenue: number; waiterHours: number }>();
    for (const ws of filteredWaiterShifts) {
      const key = ws.staff_id || ws.waiter_name;
      const existing = map.get(key);
      if (existing) { existing.revenue += Number(ws.pos_sales) || 0; existing.waiterHours += Number(ws.hours_worked) || 0; }
      else map.set(key, { staffId: ws.staff_id, name: ws.waiter_name, revenue: Number(ws.pos_sales) || 0, waiterHours: Number(ws.hours_worked) || 0 });
      const secondaries: string[] = [];
      if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) secondaries.push(ws.second_waiter_name);
      if (ws.additional_waiters?.length) for (const aw of ws.additional_waiters) if (aw && !isGlByName(aw)) secondaries.push(aw);
      for (const name of secondaries) {
        const sid = staffNameToId.get(name.toLowerCase()) ?? null;
        const sKey = sid || `secondary:${name}`;
        if (!map.has(sKey)) map.set(sKey, { staffId: sid, name, revenue: 0, waiterHours: 0 });
      }
    }
    return Array.from(map.values()).map(e => ({ ...e, hours: (e.staffId ? ztHoursByStaff.get(e.staffId) : undefined) ?? e.waiterHours, commission: 0 }));
  }, [filteredWaiterShifts, ztHoursByStaff, isGlByName, staffNameToId]);

  const staffDays = useMemo(() => dailyBreakdown.reduce((s, d) => s + d.staffCount, 0), [dailyBreakdown]);

  const result = useMemo(() => {
    const totalRevenue = aggregated.reduce((s, w) => s + w.revenue, 0);
    const totalHours = aggregated.reduce((s, w) => s + w.hours, 0);
    const avgRevenue = staffDays > 0 ? totalRevenue / staffDays : 0;
    let pool = 0, qualifyingDays = 0;
    for (const day of dailyBreakdown) {
      const dayAvg = day.staffCount > 0 ? day.revenue / day.staffCount : 0;
      if (dayAvg >= minRevenue) { pool += Math.max(0, (day.revenue - minRevenue * day.staffCount) * (commissionPct / 100)); qualifyingDays++; }
    }
    const hourlyRate = totalHours > 0 ? pool / totalHours : 0;
    const withCommission = aggregated.map(w => ({ ...w, commission: pool > 0 ? hourlyRate * w.hours : 0 }));
    return { totalRevenue, totalHours, avgRevenue, pool, withCommission, totalCommission: withCommission.reduce((s, w) => s + w.commission, 0), qualifyingDays, sessionCount: dailyBreakdown.length, staffDays };
  }, [aggregated, minRevenue, commissionPct, dailyBreakdown, staffDays]);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <span className="text-muted-foreground">Mindest-Ø-Umsatz:</span>{" "}
          <span className="font-semibold tabular-nums">{fmt(minRevenue)} €</span>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <span className="text-muted-foreground">Provisionssatz:</span>{" "}
          <span className="font-semibold tabular-nums">{commissionPct} %</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Zeitraum: {new Date(periodStartDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {new Date(periodEndDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} · ohne reine GL-Mitarbeiter
      </p>

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
          <p className="text-xs text-muted-foreground mt-1">{result.qualifyingDays} von {result.sessionCount} Tagen qualifiziert</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Σ Provisionen</p>
          <p className="text-lg font-semibold tabular-nums">{fmt(result.totalCommission)} €</p>
          <p className="text-xs text-muted-foreground mt-1">{fmt(result.totalHours > 0 ? result.totalCommission / result.totalHours : 0)} € / Stunde</p>
        </div>
      </div>

      {dailyBreakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Datum</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Servicekräfte</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Stunden</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Umsatz</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Ø pro MA</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Ø €/h Team</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Provision</th>
              </tr>
            </thead>
            <tbody>
              {dailyBreakdown.map(day => {
                const avgPerStaff = day.staffCount > 0 ? day.revenue / day.staffCount : 0;
                const belowThreshold = avgPerStaff < minRevenue;
                const hourlyRevenue = day.allDeptHours > 0 ? day.revenue / day.allDeptHours : 0;
                const dayCommission = avgPerStaff >= minRevenue ? Math.max(0, (day.revenue - minRevenue * day.staffCount) * (commissionPct / 100)) : 0;
                return (
                  <tr key={day.date} className="border-b">
                    <td className="py-2 px-2 font-medium">{fmtDate(day.date)}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{day.staffCount}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{fmt(day.hours)}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{fmt(day.revenue)}</td>
                    <td className={`text-right py-2 px-2 tabular-nums font-medium ${belowThreshold ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{fmt(avgPerStaff)}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{day.allDeptHours > 0 ? `${fmt(hourlyRevenue)} €` : "–"}</td>
                    <td className={`text-right py-2 px-2 tabular-nums font-medium ${dayCommission > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>{fmt(dayCommission)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="py-2 px-2">Gesamt</td>
                <td className="text-right py-2 px-2 tabular-nums">{dailyBreakdown.reduce((s, d) => s + d.staffCount, 0)}</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(dailyBreakdown.reduce((s, d) => s + d.hours, 0))}</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(dailyBreakdown.reduce((s, d) => s + d.revenue, 0))}</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(result.avgRevenue)}</td>
                <td className="text-right py-2 px-2 tabular-nums">
                  {(() => { const r = dailyBreakdown.reduce((s, d) => s + d.revenue, 0); const h = dailyBreakdown.reduce((s, d) => s + d.allDeptHours, 0); return h > 0 ? `${fmt(r / h)} €` : "–"; })()}
                </td>
                <td className="text-right py-2 px-2 tabular-nums text-green-600 dark:text-green-400">{fmt(result.pool)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {result.withCommission.length > 0 && (
        <p className="text-xs text-muted-foreground">Verteilung des Provisions-Topfs nach geleisteten Stunden · {result.sessionCount} Abrechnungstage</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Name</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Umsatz (€)</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Stunden (h)</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Provision (€)</th>
            </tr>
          </thead>
          <tbody>
            {result.withCommission.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Keine Service-Schichten in dieser Periode</td></tr>
            ) : (
              result.withCommission.sort((a, b) => b.revenue - a.revenue).map(w => (
                <tr key={w.staffId || w.name} className="border-b">
                  <td className="py-2 px-2 font-medium">{w.name}</td>
                  <td className="text-right py-2 px-2 tabular-nums">{fmt(w.revenue)}</td>
                  <td className="text-right py-2 px-2 tabular-nums">{fmt(w.hours)}</td>
                  <td className="text-right py-2 px-2 tabular-nums font-medium">{fmt(w.commission)}</td>
                </tr>
              ))
            )}
          </tbody>
          {result.withCommission.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="py-2 px-2">Gesamt</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(result.totalRevenue)}</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(result.totalHours)}</td>
                <td className="text-right py-2 px-2 tabular-nums">{fmt(result.totalCommission)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// =================== Staff Detail Dialog ===================

const ROLE_LABELS: Record<string, string> = {
  waiter: "Kellner", kitchen: "Küche", both: "Beides", gl: "GL",
  waiter_gl: "Kellner + GL", kitchen_gl: "Küche + GL", all: "Alle",
};

function StaffDetailDialog({ employee, onClose, onSave, isSaving }: {
  employee: any | null;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (employee) {
      setForm({
        first_name: employee.first_name ?? "",
        last_name: employee.last_name ?? "",
        nickname: employee.nickname ?? "",
        date_of_birth: employee.date_of_birth ?? "",
        nationality: employee.nationality ?? "",
        perso_nr: employee.perso_nr ?? "",
        personnel_group: employee.personnel_group ?? "",
        employment_start: employee.employment_start ?? "",
        employment_end: employee.employment_end ?? "",
        hourly_rate: employee.hourly_rate ?? "",
        contracted_hours_per_month: employee.contracted_hours_per_month ?? "",
        is_minijob: employee.is_minijob ?? false,
        is_sv_exempt: employee.is_sv_exempt ?? false,
        tax_id: employee.tax_id ?? "",
        tax_class: employee.tax_class ?? "",
        social_security_nr: employee.social_security_nr ?? "",
        health_insurance: employee.health_insurance ?? "",
        vacation_days_contractual: employee.vacation_days_contractual ?? "",
        vacation_days_current: employee.vacation_days_current ?? "",
        vacation_days_previous: employee.vacation_days_previous ?? "",
        vacation_days_taken: employee.vacation_days_taken ?? "",
        sick_days_total: employee.sick_days_total ?? "",
      });
    }
  }, [employee]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const updates: Record<string, any> = { ...form };
    for (const key of ["perso_nr", "hourly_rate", "contracted_hours_per_month", "vacation_days_contractual", "vacation_days_current", "vacation_days_previous", "vacation_days_taken", "sick_days_total"]) {
      if (updates[key] === "" || updates[key] === null) updates[key] = null;
      else updates[key] = Number(updates[key]);
    }
    for (const key of ["date_of_birth", "employment_start", "employment_end", "nationality", "personnel_group", "tax_id", "tax_class", "social_security_nr", "health_insurance", "nickname"]) {
      if (updates[key] === "") updates[key] = null;
    }
    onSave(updates);
  };

  if (!employee) return null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">{title}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );

  const Field = ({ label, field, type = "text" }: { label: string; field: string; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[field] ?? ""}
        onChange={(e) => set(field, e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={!!employee} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee.first_name || employee.last_name
              ? [employee.first_name, employee.last_name].filter(Boolean).join(" ")
              : employee.name}
          </DialogTitle>
          <DialogDescription>
            {ROLE_LABELS[employee.role] ?? employee.role}
            {employee.department && ` · ${employee.department}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Section title="Persönliche Daten">
            <Field label="Vorname" field="first_name" />
            <Field label="Nachname" field="last_name" />
            <Field label="Spitzname" field="nickname" />
            <Field label="Geburtsdatum" field="date_of_birth" type="date" />
            <Field label="Nationalität" field="nationality" />
          </Section>

          <Section title="Beschäftigung">
            <Field label="Perso-Nr" field="perso_nr" type="number" />
            <Field label="Personalgruppe" field="personnel_group" />
            <Field label="Eintrittsdatum" field="employment_start" type="date" />
            <Field label="Austrittsdatum" field="employment_end" type="date" />
          </Section>

          <Section title="Vergütung">
            <Field label="Stundenlohn (€)" field="hourly_rate" type="number" />
            <Field label="Vertragsstunden / Monat" field="contracted_hours_per_month" type="number" />
            <div className="flex items-center gap-3">
              <Switch checked={form.is_minijob ?? false} onCheckedChange={(v) => set("is_minijob", v)} />
              <Label className="text-sm">Minijob</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_sv_exempt ?? false} onCheckedChange={(v) => set("is_sv_exempt", v)} />
              <Label className="text-sm">SV-befreit</Label>
            </div>
          </Section>

          <Section title="Steuer / Sozialversicherung">
            <Field label="Steuer-ID" field="tax_id" />
            <Field label="Steuerklasse" field="tax_class" />
            <Field label="SV-Nummer" field="social_security_nr" />
            <Field label="Krankenkasse" field="health_insurance" />
          </Section>

          <Section title="Urlaub / Krankheit">
            <Field label="Vertragliche Urlaubstage" field="vacation_days_contractual" type="number" />
            <Field label="Aktuell" field="vacation_days_current" type="number" />
            <Field label="Vorjahr" field="vacation_days_previous" type="number" />
            <Field label="Genommen" field="vacation_days_taken" type="number" />
            <Field label="Krankheitstage gesamt" field="sick_days_total" type="number" />
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
