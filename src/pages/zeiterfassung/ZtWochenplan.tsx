import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { calculateShiftHours, isSunday, formatHours, DEPARTMENT_ORDER, countVacationDays, countSickDays, getDepartmentBgClass } from "@/lib/shiftCalculations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useZt } from "@/contexts/ZtContext";
import { useRestaurantEmployees, type RestaurantEmployee } from "@/hooks/useRestaurantEmployees";

type Shift = {
  id: string;
  employee_id: string;
  week_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  is_holiday: boolean;
  total_hours: number;
  sunday_holiday_hours: number;
  evening_hours: number;
  night_hours: number;
  absence_type: string | null;
  department: string | null;
};

function formatTimeInput(value: string): string {
  if (!value.trim()) return "";
  if (/^\d{1,2}$/.test(value)) return value.padStart(2, "0") + ":00";
  if (/^\d{4}$/.test(value)) return value.slice(0, 2) + ":" + value.slice(2);
  const m = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) return m[1].padStart(2, "0") + ":" + m[2].padEnd(2, "0");
  return value;
}

function handleTimeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
    return;
  }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;

  const el = e.currentTarget;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    const atEdge = e.key === "ArrowLeft"
      ? el.selectionStart === 0
      : el.selectionEnd === el.value.length;
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
    if (nextColIdx >= 0 && nextColIdx < sameCol.length) {
      sameCol[nextColIdx].focus();
      sameCol[nextColIdx].select();
    }
    return;
  }

  const target = e.key === "ArrowRight" ? idx + 1 : idx - 1;
  if (target >= 0 && target < allFields.length) {
    allFields[target].focus();
    allFields[target].select();
  }
}

export default function ZtWochenplan() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurant();
  const { selectedPeriodId, setSelectedPeriodId, selectedWeekId, setSelectedWeekId, periods, weeks, isPeriodLocked } = useZt();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingTime, setEditingTime] = useState<Record<string, string>>({});
  const [absenceDialog, setAbsenceDialog] = useState<{
    open: boolean;
    employeeId: string;
    employeeName: string;
    absenceType: 'urlaub' | 'krank';
    startDate: Date;
    endDate: Date | undefined;
    department: string | null;
  }>({ open: false, employeeId: "", employeeName: "", absenceType: "urlaub", startDate: new Date(), endDate: undefined, department: null });

  const { data: employees } = useRestaurantEmployees(restaurantId);

  const { data: shifts } = useQuery({
    queryKey: ["zt-shifts", selectedWeekId],
    queryFn: async () => {
      if (!selectedWeekId) return [];
      const { data, error } = await supabase.from("zt_shifts").select("*").eq("week_id", selectedWeekId);
      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!selectedWeekId,
  });

  const { data: holidays } = useQuery({
    queryKey: ["bavarian-holidays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bavarian_holidays").select("holiday_date, name");
      if (error) throw error;
      return new Map(data.map((h) => [h.holiday_date, h.name]));
    },
  });

  // All shifts for entire period (for totals)
  const weekIds = weeks?.map((w) => w.id) ?? [];
  const { data: allPeriodShifts } = useQuery({
    queryKey: ["zt-shifts-period", selectedPeriodId, weekIds],
    queryFn: async () => {
      if (!weekIds.length) return [];
      const { data, error } = await supabase.from("zt_shifts").select("*").in("week_id", weekIds);
      if (error) throw error;
      return data as Shift[];
    },
    enabled: weekIds.length > 0,
  });

  const selectedWeek = weeks?.find((w) => w.id === selectedWeekId);
  const weekDays = selectedWeek
    ? eachDayOfInterval({
        start: startOfWeek(parseISO(selectedWeek.start_date), { weekStartsOn: 1 }),
        end: endOfWeek(parseISO(selectedWeek.start_date), { weekStartsOn: 1 }),
      })
    : [];
  const activeDates = selectedWeek
    ? new Set(
        eachDayOfInterval({ start: parseISO(selectedWeek.start_date), end: parseISO(selectedWeek.end_date) })
          .map((d) => format(d, "yyyy-MM-dd"))
      )
    : new Set<string>();

  // Auto-scroll to today's column
  useEffect(() => {
    if (!selectedWeekId || !selectedWeek) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    // Small delay to ensure DOM is rendered after data loads
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current?.querySelector(`[data-date="${todayStr}"]`);
      if (el) {
        el.scrollIntoView({ inline: "center", behavior: "smooth" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedWeekId, selectedWeek]);

  const sortedEmployees = employees
    ? [...employees].sort((a, b) => {
        const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
        const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
        if (aIdx !== bIdx) return aIdx - bIdx;
        const nameA = (a.nickname || a.first_name || "").toLowerCase();
        const nameB = (b.nickname || b.first_name || "").toLowerCase();
        return nameA.localeCompare(nameB, "de");
      })
    : [];

  const upsertShift = useMutation({
    mutationFn: async (params: {
      employee_id: string;
      week_id: string;
      shift_date: string;
      start_time: string | null;
      end_time: string | null;
      is_holiday: boolean;
      absence_type?: string | null;
      department?: string | null;
      field?: "start_time" | "end_time";
    }) => {
      const { data: fresh } = await supabase
        .from("zt_shifts")
        .select("*")
        .eq("employee_id", params.employee_id)
        .eq("shift_date", params.shift_date)
        .eq("department", params.department ?? "")
        .maybeSingle();

      let mergedStart: string | null;
      let mergedEnd: string | null;
      if (params.field) {
        mergedStart = params.field === "start_time" ? params.start_time : (fresh?.start_time ?? null);
        mergedEnd = params.field === "end_time" ? params.end_time : (fresh?.end_time ?? null);
      } else {
        mergedStart = params.start_time;
        mergedEnd = params.end_time;
      }

      const dateObj = parseISO(params.shift_date);
      const isHoliday = params.is_holiday || (holidays?.has(params.shift_date) ?? false);
      const isSun = isSunday(dateObj);
      const hasAbsence = !!params.absence_type;
      const hours = hasAbsence
        ? { totalHours: 0, sundayHolidayHours: 0, eveningHours: 0, nightHours: 0 }
        : calculateShiftHours(mergedStart, mergedEnd, isSun || isHoliday);

      const { error } = await supabase.from("zt_shifts").upsert({
        employee_id: params.employee_id,
        week_id: params.week_id,
        shift_date: params.shift_date,
        start_time: hasAbsence ? null : mergedStart,
        end_time: hasAbsence ? null : mergedEnd,
        is_holiday: isHoliday,
        total_hours: hours.totalHours,
        sunday_holiday_hours: hours.sundayHolidayHours,
        evening_hours: hours.eveningHours,
        night_hours: hours.nightHours,
        absence_type: params.absence_type ?? null,
        department: params.department ?? '',
      }, { onConflict: "employee_id,shift_date,department" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zt-shifts", selectedWeekId] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts-period"] });
    },
    onError: () => {
      toast.error("Fehler beim Speichern");
    },
  });

  const getShift = useCallback(
    (employeeId: string, date: string, department?: string) =>
      shifts?.find((s) => s.employee_id === employeeId && s.shift_date === date && (!department || s.department === department)),
    [shifts]
  );

  const handleTimeChange = (employeeId: string, date: string, field: "start_time" | "end_time", value: string, department?: string) => {
    const existing = getShift(employeeId, date, department);
    upsertShift.mutate({
      employee_id: employeeId,
      week_id: selectedWeekId,
      shift_date: date,
      start_time: field === "start_time" ? (value || null) : null,
      end_time: field === "end_time" ? (value || null) : null,
      is_holiday: existing?.is_holiday ?? false,
      department: department ?? null,
      field,
    });
  };

  const openAbsenceDialog = (employeeId: string, date: string, absenceType: 'urlaub' | 'krank', department?: string) => {
    const emp = sortedEmployees.find(e => e.id === employeeId);
    setAbsenceDialog({
      open: true,
      employeeId,
      employeeName: emp ? ([emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name) : "",
      absenceType,
      startDate: parseISO(date),
      endDate: undefined,
      department: department ?? null,
    });
  };

  const handleAbsenceRange = () => {
    if (!weeks?.length) return;
    const { employeeId, absenceType, startDate, endDate, department } = absenceDialog;
    const rangeEnd = endDate || startDate;
    const days = eachDayOfInterval({ start: startDate, end: rangeEnd });

    let skipped = 0;
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const week = weeks.find(w => {
        const ws = parseISO(w.start_date);
        const we = parseISO(w.end_date);
        return isWithinInterval(day, { start: ws, end: we });
      });
      if (!week) { skipped++; continue; }
      upsertShift.mutate({
        employee_id: employeeId,
        week_id: week.id,
        shift_date: dateStr,
        start_time: null,
        end_time: null,
        is_holiday: holidays?.has(dateStr) ?? false,
        absence_type: absenceType,
        department: department,
      });
    }
    if (skipped > 0) toast.warning(`${skipped} Tag(e) lagen außerhalb der Periode.`);
    const count = days.length - skipped;
    toast.success(`${absenceType === 'urlaub' ? 'Urlaub' : 'Krank'} für ${count} Tag(e) eingetragen.`);
    setAbsenceDialog(prev => ({ ...prev, open: false }));
  };

  const handleAbsenceToggle = (employeeId: string, date: string, absenceType: 'krank' | 'urlaub' | null, department?: string) => {
    const existing = getShift(employeeId, date, department);
    upsertShift.mutate({
      employee_id: employeeId,
      week_id: selectedWeekId,
      shift_date: date,
      start_time: null,
      end_time: null,
      is_holiday: existing?.is_holiday ?? false,
      absence_type: absenceType,
      department: department ?? null,
    });
  };

  const getEmployeeWeekTotals = (employeeId: string, department?: string) => {
    const empShifts = shifts?.filter((s) => s.employee_id === employeeId && (!department || s.department === department)) ?? [];
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const isLocked = isPeriodLocked;

  if (!periods?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Wöchentliche Zeiterfassung</h1>
        <p className="text-muted-foreground">Perioden werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <Select value={selectedPeriodId} onValueChange={(v) => { setSelectedPeriodId(v); setSelectedWeekId(""); }}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Periode wählen" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLocked && <Badge variant="secondary" className="text-xs px-1.5 py-0">Gesperrt</Badge>}

        {weeks && weeks.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {weeks.map((w) => (
              <Button
                key={w.id}
                variant={w.id === selectedWeekId ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedWeekId(w.id)}
              >
                W{w.week_number}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedWeekId && weekDays.length > 0 && (() => {
        const sundayHolidayDays = new Set(
          weekDays
            .filter((day) => isSunday(day) || holidays?.has(format(day, "yyyy-MM-dd")))
            .map((day) => format(day, "yyyy-MM-dd"))
        );
        const holidayDays = new Set(
          weekDays
            .filter((day) => holidays?.has(format(day, "yyyy-MM-dd")))
            .map((day) => format(day, "yyyy-MM-dd"))
        );
        let empIndexInDept = 0;

        return (
          <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto flex-1 min-h-0 border rounded-lg shadow-sm">
            <table className="w-full text-sm wochenplan-table border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-muted">
                  <th className="sticky-name text-left p-1.5 font-semibold sticky left-0 bg-muted z-30 min-w-[140px] border-b border-border text-xs" />
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isSunHol = sundayHolidayDays.has(dateStr);
                    const holidayName = holidays?.get(dateStr);
                    return (
                      <th
                        key={day.toISOString()}
                        colSpan={2}
                        data-date={dateStr}
                        className={`text-center p-1.5 font-semibold min-w-[120px] border-b border-border text-xs ${dayIdx > 0 ? "day-separator" : ""} ${holidayDays.has(dateStr) ? "sunday-col" : ""} ${!activeDates.has(dateStr) ? "inactive-day" : ""}`}
                      >
                        {holidayName ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-destructive font-bold cursor-help">{format(day, "EE", { locale: de })} {format(day, "dd.MM")}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{holidayName}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className={`${!activeDates.has(dateStr) ? "text-muted-foreground" : ""}`}>{format(day, "EE", { locale: de })} {format(day, "dd.MM")}</span>
                        )}
                      </th>
                    );
                  })}
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-l-2 border-primary/20 border-b border-border text-xs">Ges</th>
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs">So/F</th>
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs">20-24</th>
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs">24-x</th>
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[35px] border-b border-border text-xs">U</th>
                  <th className="totals-header text-center p-1.5 font-semibold min-w-[35px] border-b border-border text-xs">K</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp, idx) => {
                  const prevDept = idx > 0 ? sortedEmployees[idx - 1].department : null;
                  const showDeptHeader = emp.department !== prevDept;
                  if (showDeptHeader) empIndexInDept = 0;
                  const isEvenRow = empIndexInDept % 2 === 1;
                  empIndexInDept++;
                  const totals = getEmployeeWeekTotals(emp.id, emp.department);
                  const deptColor = emp.department === "Küche" ? "dept-kueche" : emp.department === "GL" ? "dept-gl" : "dept-service";

                  return (
                    <React.Fragment key={`${emp.id}-${emp.department}`}>
                      {showDeptHeader && (
                        <tr className="dept-header-row">
                          <td
                            colSpan={weekDays.length * 2 + 7}
                            className={`px-3 py-2.5 font-bold text-sm uppercase tracking-wide border-l-4 ${
                              emp.department === "Küche" ? "border-[hsl(15_80%_50%)]" :
                              emp.department === "GL" ? "border-[hsl(220_60%_50%)]" :
                              "border-[hsl(145_60%_40%)]"
                            } ${getDepartmentBgClass(emp.department)} ${idx > 0 ? "border-t-2 border-t-border" : ""}`}
                          >
                            {emp.department}
                          </td>
                        </tr>
                      )}
                      <tr className={`border-t border-border/50 ${isEvenRow ? "zebra-even" : ""}`}>
                        <td className="sticky-name p-2 sticky left-0 z-10 font-medium border-r border-border/30">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-0.5 h-4 rounded-full ${deptColor} opacity-60`}></div>
                            <span className="truncate">{emp.nickname || emp.first_name || emp.name}</span>
                          </div>
                        </td>
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isActive = activeDates.has(dateStr);
                          const shift = isActive ? getShift(emp.id, dateStr, emp.department) : undefined;
                          const isSunHol = sundayHolidayDays.has(dateStr);
                          const isHoliday = holidayDays.has(dateStr);
                          const sunClass = isHoliday && isActive ? "sunday-col" : "";
                          const sepClass = dayIdx > 0 ? "day-separator" : "";
                          const absenceType = shift?.absence_type as string | null;
                          const startVal = shift?.start_time?.slice(0, 5) ?? "";
                          const endVal = shift?.end_time?.slice(0, 5) ?? "";
                          return (
                            <React.Fragment key={`${emp.id}-${dateStr}`}>
                              {absenceType && isActive ? (
                                <td colSpan={2} className={`p-0.5 text-center ${sunClass} ${sepClass}`}>
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
                              ) : (
                                <>
                                  <td className={`p-0.5 group ${!isActive ? "inactive-day" : ""} ${sunClass} ${sepClass}`}>
                                    {isActive ? (
                                      <div className="relative flex items-center">
                                        <Input
                                          type="text"
                                          className="h-7 text-xs px-1 w-[72px] text-center time-input-clean"
                                          placeholder=""
                                          data-has-value={!!(editingTime[`${emp.id}-${dateStr}-start_time`] ?? startVal)}
                                          data-time-field={`${emp.id}-${dateStr}-start_time`}
                                          data-time-col={`${dateStr}-start_time`}
                                          value={editingTime[`${emp.id}-${dateStr}-start_time`] ?? startVal}
                                          onChange={(e) => {
                                            const key = `${emp.id}-${dateStr}-start_time`;
                                            setEditingTime(prev => ({ ...prev, [key]: e.target.value }));
                                          }}
                                          onBlur={(e) => {
                                            const key = `${emp.id}-${dateStr}-start_time`;
                                            const raw = e.target.value;
                                            const formatted = formatTimeInput(raw);
                                            if (formatted) {
                                              handleTimeChange(emp.id, dateStr, "start_time", formatted, emp.department);
                                            } else if (!raw.trim() && startVal) {
                                              handleTimeChange(emp.id, dateStr, "start_time", "", emp.department);
                                            }
                                            const endKey = `${emp.id}-${dateStr}-end_time`;
                                            const pendingEnd = editingTime[endKey];
                                            if (pendingEnd) {
                                              const formattedEnd = formatTimeInput(pendingEnd);
                                              if (formattedEnd) {
                                                handleTimeChange(emp.id, dateStr, "end_time", formattedEnd, emp.department);
                                              }
                                            }
                                            setEditingTime(prev => {
                                              const next = { ...prev };
                                              delete next[key];
                                              delete next[endKey];
                                              return next;
                                            });
                                          }}
                                          onKeyDown={handleTimeKeyDown}
                                          onFocus={(e) => e.target.select()}
                                          disabled={isLocked}
                                        />
                                        {!isLocked && !startVal && !endVal && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                className="absolute -right-1 top-0 h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
                                                title="Abwesenheit setzen"
                                                tabIndex={-1}
                                              >
                                                ⋮
                                              </button>
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
                                    ) : null}
                                  </td>
                                  <td className={`p-0.5 ${!isActive ? "inactive-day" : ""} ${sunClass}`}>
                                    {isActive ? (
                                      <Input
                                        type="text"
                                        className="h-7 text-xs px-1 w-[72px] text-center time-input-clean"
                                        placeholder=""
                                        data-has-value={!!(editingTime[`${emp.id}-${dateStr}-end_time`] ?? endVal)}
                                        data-time-field={`${emp.id}-${dateStr}-end_time`}
                                        data-time-col={`${dateStr}-end_time`}
                                        value={editingTime[`${emp.id}-${dateStr}-end_time`] ?? endVal}
                                        onChange={(e) => {
                                          const key = `${emp.id}-${dateStr}-end_time`;
                                          setEditingTime(prev => ({ ...prev, [key]: e.target.value }));
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        onBlur={(e) => {
                                          const key = `${emp.id}-${dateStr}-end_time`;
                                          const raw = e.target.value;
                                          const formatted = formatTimeInput(raw);
                                          if (formatted) {
                                            handleTimeChange(emp.id, dateStr, "end_time", formatted, emp.department);
                                          } else if (!raw.trim() && endVal) {
                                            handleTimeChange(emp.id, dateStr, "end_time", "", emp.department);
                                          }
                                          setEditingTime(prev => {
                                            const next = { ...prev };
                                            delete next[key];
                                            return next;
                                          });
                                        }}
                                        onKeyDown={handleTimeKeyDown}
                                        disabled={isLocked}
                                      />
                                    ) : null}
                                  </td>
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <td className={`text-center p-2 border-l-2 border-primary/20 bg-primary/5 ${totals.gesamt > 0 ? "font-bold text-sm" : "text-xs text-muted-foreground"}`}>{formatHours(totals.gesamt)}</td>
                        <td className="totals-col text-center p-2 text-xs">{totals.soFei > 0 ? formatHours(totals.soFei) : ""}</td>
                        <td className="totals-col text-center p-2 text-xs">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                        <td className="totals-col text-center p-2 text-xs">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
                        <td className="totals-col text-center p-2 text-xs text-success font-medium">{totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
                        <td className="totals-col text-center p-2 text-xs text-destructive font-medium">{totals.krankTage > 0 ? totals.krankTage : ""}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      <Dialog open={absenceDialog.open} onOpenChange={(open) => setAbsenceDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {absenceDialog.absenceType === 'urlaub' ? 'Urlaub' : 'Krankheit'} eintragen
            </DialogTitle>
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
                  <Calendar
                    mode="single"
                    selected={absenceDialog.startDate}
                    onSelect={(d) => d && setAbsenceDialog(prev => ({ ...prev, startDate: d }))}
                    locale={de}
                    className="p-3 pointer-events-auto"
                  />
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
                  <Calendar
                    mode="single"
                    selected={absenceDialog.endDate}
                    onSelect={(d) => setAbsenceDialog(prev => ({ ...prev, endDate: d || undefined }))}
                    locale={de}
                    disabled={(d) => d < absenceDialog.startDate}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceDialog(prev => ({ ...prev, open: false }))}>
              Abbrechen
            </Button>
            <Button onClick={handleAbsenceRange}>
              Eintragen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
