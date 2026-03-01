import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import type { Shift, PayrollNote, AdvanceEntry } from "@/pages/zeiterfassung/buchhaltung/types";
import BuchhaltungTableHead from "@/pages/zeiterfassung/buchhaltung/BuchhaltungTableHead";
import BuchhaltungDeptHeader from "@/pages/zeiterfassung/buchhaltung/BuchhaltungDeptHeader";
import BuchhaltungFooter from "@/pages/zeiterfassung/buchhaltung/BuchhaltungFooter";

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
  holidays: { holiday_date: string; name: string }[];
  matchingPeriods: { id: string; label: string; restaurant_name: string; restaurant_id: string }[];
};

export default function PayrollPortal() {
  const [pin, setPin] = useState(() => sessionStorage.getItem("payroll_pin") ?? "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const { period, weeks, shifts, employees, payrollNotes, advances, holidays, weekNumberToAllIds, weekToRestaurant, matchingPeriods } = data;
  const holidayMap = new Map(holidays.map(h => [h.holiday_date, h.name]));
  const hasMultipleRestaurants = matchingPeriods.length > 1;

  // Unique restaurants from matchingPeriods
  const restaurants = useMemo(() => {
    const seen = new Map<string, string>();
    matchingPeriods.forEach(p => { if (!seen.has(p.restaurant_id)) seen.set(p.restaurant_id, p.restaurant_name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [matchingPeriods]);

  useEffect(() => {
    if (weeks?.length && !selectedWeekId) setSelectedWeekId(weeks[0].id);
  }, [weeks, selectedWeekId]);

  // Filtering logic
  const effectiveRestaurant = hasMultipleRestaurants ? selectedRestaurant : "all";

  const filteredShifts = useMemo(() => {
    if (effectiveRestaurant === "all") return shifts;
    return shifts.filter(s => weekToRestaurant[s.week_id] === effectiveRestaurant);
  }, [shifts, effectiveRestaurant, weekToRestaurant]);

  const filteredEmployees = useMemo(() => {
    if (effectiveRestaurant === "all") return employees;
    return employees.filter((e: any) => e.restaurant_id === effectiveRestaurant);
  }, [employees, effectiveRestaurant]);

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

  const employeesWithShifts = sortedEmployees.filter((emp) =>
    filteredShifts.some((s) => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wochenplan">Wochenplan</TabsTrigger>
          <TabsTrigger value="zusammenfassung">Zusammenfassung</TabsTrigger>
          <TabsTrigger value="buchhaltung">Buchhaltung</TabsTrigger>
        </TabsList>

        <TabsContent value="wochenplan">
          <PayrollWochenplanTab
            weeks={weeks}
            shifts={filteredShifts}
            employees={sortedEmployees}
            holidays={holidayMap}
            periodLabel={period.label}
            selectedWeekId={selectedWeekId}
            onSelectWeek={setSelectedWeekId}
            isLocked={isLocked}
            pin={pin}
            weekNumberToAllIds={effectiveWeekNumberToAllIds}
            onShiftsChanged={() => queryClient.invalidateQueries({ queryKey: ["payroll-data"] })}
          />
        </TabsContent>

        <TabsContent value="zusammenfassung">
          <PayrollZusammenfassungTab
            weeks={weeks}
            shifts={filteredShifts}
            employees={employeesWithShifts}
            periodLabel={period.label}
            weekNumberToAllIds={effectiveWeekNumberToAllIds}
          />
        </TabsContent>

        <TabsContent value="buchhaltung">
          <PayrollBuchhaltungTab
            shifts={filteredShifts}
            employees={employeesWithShifts}
            payrollNotes={filteredPayrollNotes}
            advances={filteredAdvances}
            periodLabel={period.label}
            isLocked={isLocked}
            onUpsertNote={(p) => upsertNote.mutate(p)}
          />
        </TabsContent>
      </Tabs>
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

function PayrollWochenplanTab({ weeks, shifts, employees, holidays, periodLabel, selectedWeekId, onSelectWeek, isLocked, pin, weekNumberToAllIds, onShiftsChanged }: {
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
                          {emp.nickname || emp.first_name || emp.name}
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

function PayrollZusammenfassungTab({ weeks, shifts, employees, periodLabel, weekNumberToAllIds }: {
  weeks: any[];
  shifts: Shift[];
  employees: any[];
  periodLabel: string;
  weekNumberToAllIds: Record<number, string[]>;
}) {
  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weekNumberToAllIds[weekNumber] ?? weeks.filter(w => w.week_number === weekNumber).map(w => w.id);
    return shifts.filter(s => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department))
      .reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  const getEmpTotals = (empId: string, department?: string) => {
    const empShifts = shifts.filter(s => s.employee_id === empId && (!department || s.department === department));
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungPdf(periodLabel, employees, weeks, shifts as any, weekNumberToAllIds)}>
          <FileDown className="mr-1 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungExcel(periodLabel, employees, weeks, shifts as any, weekNumberToAllIds)}>
          <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 font-medium">Mitarbeiter</th>
              {weeks.map(w => <th key={w.id} className="text-center p-2 font-medium whitespace-nowrap">W{w.week_number}</th>)}
              <th className="text-center p-2 font-medium">Gesamt</th>
              <th className="text-center p-2 font-medium">Schichten</th>
              <th className="text-center p-2 font-medium">So/Fei</th>
              <th className="text-center p-2 font-medium">20-24</th>
              <th className="text-center p-2 font-medium">24-x</th>
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
                  {showDeptHeader && (
                    <tr>
                      <td colSpan={weeks.length + 8} className={`p-2 font-bold text-xs uppercase tracking-wide ${getDepartmentBgClass(emp.department)}`}>
                        {emp.department}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium">
                      <span className="text-xs text-muted-foreground mr-1">{emp.perso_nr}</span>
                      {emp.nickname ? `${emp.nickname} - ` : ""}{[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name}
                    </td>
                    {weeks.map(w => {
                      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
                      return <td key={w.id} className="text-center p-2">{h > 0 ? formatHours(h) : ""}</td>;
                    })}
                    <td className="text-center p-2 font-medium">{formatHours(totals.gesamt)}</td>
                    <td className="text-center p-2">{totals.schichten || ""}</td>
                    <td className="text-center p-2">{totals.soFei > 0 ? formatHours(totals.soFei) : ""}</td>
                    <td className="text-center p-2">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                    <td className="text-center p-2">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
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

function PayrollBuchhaltungTab({ shifts, employees, payrollNotes, advances, periodLabel, isLocked, onUpsertNote }: {
  shifts: Shift[];
  employees: any[];
  payrollNotes: PayrollNote[];
  advances: AdvanceEntry[];
  periodLabel: string;
  isLocked: boolean;
  onUpsertNote: (p: { employee_id: string; field: string; value: any }) => void;
}) {
  const advancesByName = useMemo(() => {
    const map: Record<string, AdvanceEntry[]> = {};
    advances.forEach(a => { (map[a.staff_name] ??= []).push(a); });
    return map;
  }, [advances]);

  const grandTotals = useMemo(() => {
    const t = { gesamt: 0, schichten: 0, soFei: 0, evening: 0, night: 0, urlaubTage: 0, krankTage: 0 };
    employees.forEach(emp => {
      const row = getEmployeeTotals(emp.id, shifts, emp.department);
      t.gesamt += row.gesamt; t.schichten += row.schichten; t.soFei += row.soFei;
      t.evening += row.evening; t.night += row.night; t.urlaubTage += row.urlaubTage; t.krankTage += row.krankTage;
    });
    return t;
  }, [employees, shifts]);

  let zebraIdx = 0;
  let lastDept: string | null = null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportBuchhaltungPdf(periodLabel, employees, shifts, payrollNotes); toast.success("PDF erstellt"); }}>
          <FileDown className="mr-1 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => { exportBuchhaltungExcel(periodLabel, employees, shifts, payrollNotes); toast.success("Excel erstellt"); }}>
          <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <BuchhaltungTableHead />
            <tbody>
              {employees.map(emp => {
                const showDeptHeader = emp.department !== lastDept;
                if (showDeptHeader) { zebraIdx = 0; lastDept = emp.department; }
                const isEven = zebraIdx % 2 === 1;
                zebraIdx++;

                const totals = getEmployeeTotals(emp.id, shifts, emp.department);
                const note = payrollNotes.find(n => n.employee_id === emp.id);
                const empShifts = shifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
                const empAdvances = advancesByName[emp.name] ?? [];

                const advanceSum = empAdvances.reduce((s, a) => s + a.amount, 0);
                const advanceText = empAdvances.map(a => `Vorschuss ${format(parseISO(a.date), "dd.MM.")}: ${a.amount.toFixed(2).replace(".", ",")} €`).join("; ");
                const vorschussValue = advanceSum > 0 ? advanceSum : (note?.vorschuss ?? 0);
                const vacRanges = getVacationDateRanges(empShifts);
                const vacText = vacRanges.length > 0 ? `U: ${formatSickRanges(vacRanges).join(", ")}` : "";
                const besonderheitenValue = [advanceText, vacText, note?.besonderheiten].filter(Boolean).join(" | ");

                const nameParts = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name;
                const metaParts: string[] = [];
                if (emp.nickname) metaParts.push(emp.nickname);
                if (emp.perso_nr && emp.perso_nr > 0) metaParts.push(String(emp.perso_nr));
                const metaStr = metaParts.length > 0 ? ` (${metaParts.join(" · ")})` : "";
                const rowBg = isEven ? "bg-muted/30" : "";

                return (
                  <React.Fragment key={`${emp.id}-${emp.department}`}>
                    {showDeptHeader && <BuchhaltungDeptHeader department={emp.department} />}
                    <tr className={`border-t border-border/50 hover:bg-primary/5 transition-colors ${rowBg}`}>
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                        {nameParts}
                        {metaStr && <span className="text-xs text-muted-foreground">{metaStr}</span>}
                      </td>
                      <td className="text-center px-1 py-1.5 font-semibold tabular-nums bg-primary/5 border-l border-border/40">{formatHours(totals.gesamt)}</td>
                      <td className="text-center px-1 py-1.5 tabular-nums">{totals.schichten || "–"}</td>
                      <td className="text-center px-1 py-1.5 tabular-nums">{totals.soFei > 0 ? formatHours(totals.soFei) : "–"}</td>
                      <td className="text-center px-1 py-1.5 tabular-nums">{totals.evening > 0 ? formatHours(totals.evening) : "–"}</td>
                      <td className="text-center px-1 py-1.5 tabular-nums">{totals.night > 0 ? formatHours(totals.night) : "–"}</td>
                      <td className="text-center px-1 py-1.5 tabular-nums text-green-600 font-medium border-l border-border/40">
                        {totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace(".", ",") : "–"}
                      </td>
                      <td className="text-center px-1 py-1.5 tabular-nums text-destructive font-medium">
                        {totals.krankTage > 0 ? totals.krankTage : "–"}
                      </td>
                      <td className="p-1 border-l border-border/40">
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="time-input-clean h-7 text-xs w-[65px] mx-auto text-center"
                          defaultValue={vorschussValue}
                          disabled={isLocked || advanceSum > 0}
                          onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "vorschuss", value: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-1">
                        <Textarea
                          className="time-input-clean text-xs min-h-[28px] h-7 resize-none"
                          defaultValue={besonderheitenValue}
                          disabled={isLocked}
                          onBlur={(e) => onUpsertNote({ employee_id: emp.id, field: "besonderheiten", value: e.target.value })}
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            {employees.length > 0 && <BuchhaltungFooter grandTotals={grandTotals} />}
          </table>
        </div>
      </Card>
    </div>
  );
}
