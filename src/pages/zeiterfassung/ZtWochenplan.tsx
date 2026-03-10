import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { calculateShiftHours, isSunday, formatHours, DEPARTMENT_ORDER, countVacationDays, countSickDays, getDepartmentBgClass, effectiveEveningHours, effectiveNightHours } from "@/lib/shiftCalculations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon, FileDown, FileSpreadsheet } from "lucide-react";
import { ZtToolbar } from "@/components/zeiterfassung/ZtToolbar";
import { exportWochenplanPdf } from "@/lib/exportWochenplanPdf";
import { exportWochenplanExcel } from "@/lib/exportWochenplanExcel";
import { cn } from "@/lib/utils";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import SfnTooltipHeader from "@/components/zeiterfassung/SfnTooltipHeader";
import { useRestaurant, useRestaurants } from "@/hooks/useRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import { useZt } from "@/contexts/ZtContext";
import { useRestaurantEmployees, type RestaurantEmployee } from "@/hooks/useRestaurantEmployees";
import { useCumulatedZtData } from "@/hooks/useCumulatedZtData";
import { useHolidayRates } from "@/hooks/useHolidayRates";

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
  night_deep_hours: number;
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
  const { data: restaurants } = useRestaurants();
  const { selectedPeriodId, setSelectedPeriodId, selectedWeekId, setSelectedWeekId, periods, weeks, isPeriodLocked } = useZt();
  const outletContext = useOutletContext<{ sfnMode?: string }>();
  const sfnMode = (outletContext?.sfnMode as "simple" | "extended") ?? "simple";
  const { data: holidayRatesMap } = useHolidayRates();
  const { hasPermission } = useAuth();
  const showSfn = hasPermission('admin');

  const [cumulated, setCumulated] = useState(false);

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

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);

  // Cumulated data hook
  const cumData = useCumulatedZtData(
    cumulated,
    selectedPeriod ? { start_date: selectedPeriod.start_date, end_date: selectedPeriod.end_date } : undefined
  );

  const { data: restaurantEmployees } = useRestaurantEmployees(restaurantId);

  // Effective employees: cumulated or restaurant-specific
  const employees = cumulated ? cumData.employees : restaurantEmployees;

  // Effective weeks: cumulated (deduplicated by week_number) or restaurant-specific
  const effectiveWeeks = cumulated ? cumData.weeks : weeks;

  // When cumulated, map selectedWeekId to the deduplicated week
  // We need a "virtual" selectedWeekId for cumulated mode
  const [cumSelectedWeekNum, setCumSelectedWeekNum] = useState<number | null>(null);

  // Derive selectedWeek based on mode
  const selectedWeek = useMemo(() => {
    if (cumulated) {
      return cumData.weeks?.find(w => w.week_number === cumSelectedWeekNum) ?? null;
    }
    return weeks?.find(w => w.id === selectedWeekId) ?? null;
  }, [cumulated, cumData.weeks, cumSelectedWeekNum, weeks, selectedWeekId]);

  // All week IDs for the selected week (cumulated: all restaurants, normal: just one)
  const selectedWeekIds = useMemo(() => {
    if (cumulated && cumSelectedWeekNum !== null) {
      return cumData.weekNumberToAllIds[cumSelectedWeekNum] ?? [];
    }
    return selectedWeekId ? [selectedWeekId] : [];
  }, [cumulated, cumSelectedWeekNum, cumData.weekNumberToAllIds, selectedWeekId]);

  // Shifts for current week
  const { data: shifts } = useQuery({
    queryKey: ["zt-shifts", cumulated ? `cum-${cumSelectedWeekNum}` : selectedWeekId, selectedWeekIds],
    queryFn: async () => {
      if (!selectedWeekIds.length) return [];
      const { data, error } = await supabase.from("zt_shifts").select("*").in("week_id", selectedWeekIds);
      if (error) throw error;
      return data as Shift[];
    },
    enabled: selectedWeekIds.length > 0,
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
  const allPeriodWeekIds = useMemo(() => {
    if (cumulated) {
      return cumData.allWeekIds;
    }
    return weeks?.map(w => w.id) ?? [];
  }, [cumulated, cumData.allWeekIds, weeks]);

  const { data: allPeriodShifts } = useQuery({
    queryKey: ["zt-shifts-period", cumulated ? "cum" : selectedPeriodId, allPeriodWeekIds],
    queryFn: async () => {
      if (!allPeriodWeekIds.length) return [];
      const { data, error } = await supabase.from("zt_shifts").select("*").in("week_id", allPeriodWeekIds);
      if (error) throw error;
      return data as Shift[];
    },
    enabled: allPeriodWeekIds.length > 0,
  });

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
    if (!selectedWeek) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current?.querySelector(`[data-date="${todayStr}"]`);
      if (el) {
        el.scrollIntoView({ inline: "center", behavior: "smooth" });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedWeek]);

  const sortedEmployees = employees
    ? [...employees].sort((a, b) => {
        const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
        const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
        if (aIdx !== bIdx) return aIdx - bIdx;
        const nameA = (a.nickname || (a.name && a.name !== a.first_name && a.name !== a.last_name ? a.name : null) || a.first_name || "").toLowerCase();
        const nameB = (b.nickname || (b.name && b.name !== b.first_name && b.name !== b.last_name ? b.name : null) || b.first_name || "").toLowerCase();
        return nameA.localeCompare(nameB, "de");
      })
    : [];

  // Global shifts query: load all shifts for displayed employees on visible dates (across all weeks/restaurants)
  const employeeIds = sortedEmployees.map(e => e.id);
  const dateStrings = weekDays.map(d => format(d, "yyyy-MM-dd"));

  const { data: globalShifts } = useQuery({
    queryKey: ["zt-shifts-global", employeeIds, dateStrings],
    queryFn: async () => {
      const { data } = await supabase
        .from("zt_shifts")
        .select("employee_id, shift_date, department, week_id, start_time, end_time, total_hours, absence_type, weeks!inner(scheduling_periods!inner(restaurants(name)))")
        .in("employee_id", employeeIds)
        .in("shift_date", dateStrings);
      return data ?? [];
    },
    enabled: employeeIds.length > 0 && dateStrings.length > 0,
  });

  const getConflict = useCallback(
    (empId: string, date: string, dept: string) => {
      // In cumulated mode, no conflicts — we show all
      if (cumulated) return null;
      return globalShifts?.find(s =>
        s.employee_id === empId &&
        s.shift_date === date &&
        s.week_id !== selectedWeekId &&
        (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0)
      ) ?? null;
    },
    [globalShifts, selectedWeekId, cumulated]
  );

  // Find the correct week_id for an employee in cumulated mode
  const findWeekIdForEmployee = useCallback(
    (employeeId: string, weekNumber: number): string | null => {
      if (!cumulated || !cumData.matchingPeriods || !cumData.weeks) return selectedWeekId;
      // We need to find which restaurant this employee belongs to, then find the week_id
      // Look through all weeks with this week_number
      const weekIdsForNumber = cumData.weekNumberToAllIds[weekNumber] ?? [];
      if (weekIdsForNumber.length === 1) return weekIdsForNumber[0];
      // If multiple, we need to find the right one based on the employee's restaurant
      // The shifts already loaded can tell us which week_id this employee used before
      const existingShift = shifts?.find(s => s.employee_id === employeeId && weekIdsForNumber.includes(s.week_id));
      if (existingShift) return existingShift.week_id;
      // Fallback: use the first one (or the current restaurant's week)
      const currentRestWeek = weeks?.find(w => w.week_number === weekNumber);
      if (currentRestWeek && weekIdsForNumber.includes(currentRestWeek.id)) return currentRestWeek.id;
      return weekIdsForNumber[0] ?? null;
    },
    [cumulated, cumData.matchingPeriods, cumData.weeks, cumData.weekNumberToAllIds, selectedWeekId, shifts, weeks]
  );

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
      // --- Conflict check ---
      const { data: allShiftsOnDay } = await supabase
        .from("zt_shifts")
        .select("id, department, week_id, start_time, absence_type, total_hours")
        .eq("employee_id", params.employee_id)
        .eq("shift_date", params.shift_date);

      // In cumulated mode, skip cross-restaurant conflict check
      if (!cumulated) {
        const hasConflict = allShiftsOnDay?.some(s =>
          s.week_id !== params.week_id &&
          (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0)
        );
        if (hasConflict) {
          const conflicting = allShiftsOnDay?.find(s => s.week_id !== params.week_id && (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0));
          throw new Error(`Schicht existiert bereits am ${params.shift_date} in Abt. ${conflicting?.department || '?'} (anderes Restaurant)`);
        }
      }

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
        ? { totalHours: 0, sundayHolidayHours: 0, eveningHours: 0, nightHours: 0, nightDeepHours: 0 }
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
        night_deep_hours: hours.nightDeepHours,
        absence_type: params.absence_type ?? null,
        department: params.department ?? '',
      }, { onConflict: "employee_id,shift_date,department" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zt-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts-period"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts-global"] });
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

  const getWeekIdForUpsert = useCallback(
    (employeeId: string, dateStr: string): string => {
      if (cumulated && selectedWeek) {
        const wId = findWeekIdForEmployee(employeeId, selectedWeek.week_number);
        if (wId) return wId;
      }
      return selectedWeekId;
    },
    [cumulated, selectedWeek, findWeekIdForEmployee, selectedWeekId]
  );

  const handleTimeChange = (employeeId: string, date: string, field: "start_time" | "end_time", value: string, department?: string) => {
    const existing = getShift(employeeId, date, department);
    const weekId = getWeekIdForUpsert(employeeId, date);
    upsertShift.mutate({
      employee_id: employeeId,
      week_id: weekId,
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

  const handleAbsenceRange = async () => {
    const { employeeId, absenceType, startDate, endDate, department } = absenceDialog;
    const rangeEnd = endDate || startDate;
    const days = eachDayOfInterval({ start: startDate, end: rangeEnd });

    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(rangeEnd, "yyyy-MM-dd");

    // Load ALL weeks across ALL periods that cover the absence range
    const { data: coveringPeriods, error: pErr } = await supabase
      .from("scheduling_periods")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .lte("start_date", endStr)
      .gte("end_date", startStr);

    if (pErr || !coveringPeriods?.length) {
      toast.error("Keine Abrechnungsperioden für diesen Zeitraum gefunden.");
      return;
    }

    let allCoveringPeriodIds = coveringPeriods.map(p => p.id);

    // In cumulated mode, also load periods from other restaurants with matching dates
    if (cumulated) {
      const { data: allMatchingPeriods } = await supabase
        .from("scheduling_periods")
        .select("id")
        .lte("start_date", endStr)
        .gte("end_date", startStr);
      if (allMatchingPeriods?.length) {
        allCoveringPeriodIds = [...new Set([...allCoveringPeriodIds, ...allMatchingPeriods.map(p => p.id)])];
      }
    }

    const { data: allCoveringWeeks, error: wErr } = await supabase
      .from("weeks")
      .select("*")
      .in("period_id", allCoveringPeriodIds)
      .order("week_number");

    if (wErr || !allCoveringWeeks?.length) {
      toast.error("Keine Wochen für diesen Zeitraum gefunden.");
      return;
    }

    // Deduplicate weeks by week_number (use first occurrence) for non-cumulated mode
    const weeksToUse = cumulated
      ? (() => {
          const seen = new Set<string>();
          const deduped: typeof allCoveringWeeks = [];
          for (const w of allCoveringWeeks) {
            const key = `${w.start_date}-${w.end_date}`;
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(w);
          }
          return deduped;
        })()
      : allCoveringWeeks.filter(w => coveringPeriods.some(p => p.id === w.period_id));

    // Build a lookup: week_number → all week IDs (for cumulated mode)
    const weekNumToIds: Record<number, string[]> = {};
    for (const w of allCoveringWeeks) {
      (weekNumToIds[w.week_number] ??= []).push(w.id);
    }

    let skipped = 0;
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      const week = weeksToUse.find(w => {
        const ws = parseISO(w.start_date);
        const we = parseISO(w.end_date);
        return isWithinInterval(day, { start: ws, end: we });
      });
      if (!week) { skipped++; continue; }

      // In cumulated mode, find the right week_id for this employee
      let weekId = week.id;
      if (cumulated) {
        const weekIdsForNumber = weekNumToIds[week.week_number] ?? [];
        if (weekIdsForNumber.length > 1) {
          // Try to find via existing shift or current restaurant week
          const existingShift = shifts?.find(s => s.employee_id === employeeId && weekIdsForNumber.includes(s.week_id));
          if (existingShift) {
            weekId = existingShift.week_id;
          } else {
            const currentRestWeek = weeks?.find(w => w.week_number === week.week_number);
            if (currentRestWeek && weekIdsForNumber.includes(currentRestWeek.id)) weekId = currentRestWeek.id;
            else weekId = weekIdsForNumber[0];
          }
        }
      }

      upsertShift.mutate({
        employee_id: employeeId,
        week_id: weekId,
        shift_date: dateStr,
        start_time: null,
        end_time: null,
        is_holiday: holidays?.has(dateStr) ?? false,
        absence_type: absenceType,
        department: department,
      });
    }
    if (skipped > 0) toast.warning(`${skipped} Tag(e) lagen außerhalb der verfügbaren Wochen.`);
    const count = days.length - skipped;
    toast.success(`${absenceType === 'urlaub' ? 'Urlaub' : 'Krank'} für ${count} Tag(e) eingetragen.`);
    setAbsenceDialog(prev => ({ ...prev, open: false }));
  };

  const handleAbsenceToggle = (employeeId: string, date: string, absenceType: 'krank' | 'urlaub' | null, department?: string) => {
    const existing = getShift(employeeId, date, department);
    const weekId = getWeekIdForUpsert(employeeId, date);
    upsertShift.mutate({
      employee_id: employeeId,
      week_id: weekId,
      shift_date: date,
      start_time: null,
      end_time: null,
      is_holiday: existing?.is_holiday ?? false,
      absence_type: absenceType,
      department: department ?? null,
    });
  };

  const isExtended = sfnMode === "extended";

  const getEmployeeWeekTotals = (employeeId: string, department?: string) => {
    const empShifts = shifts?.filter((s) => s.employee_id === employeeId && (!department || s.department === department)) ?? [];
    let sonntagStunden = 0;
    let feiertag125Stunden = 0;
    let feiertag150Stunden = 0;
    if (isExtended) {
      for (const s of empShifts) {
        const hrs = Number(s.sunday_holiday_hours);
        if (hrs <= 0) continue;
        const isHol = s.is_holiday || (holidays?.has(s.shift_date) ?? false);
        const isSun = isSunday(parseISO(s.shift_date));
        if (isHol) {
          const rate = holidayRatesMap?.get(s.shift_date) ?? 125;
          if (rate >= 150) feiertag150Stunden += hrs;
          else feiertag125Stunden += hrs;
        } else if (isSun) {
          sonntagStunden += hrs;
        }
      }
    }
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      sonntagStunden,
      feiertag125Stunden,
      feiertag150Stunden,
      evening: empShifts.reduce((sum, s) => sum + (isExtended ? Number(s.evening_hours) : effectiveEveningHours(s)), 0),
      night: empShifts.reduce((sum, s) => sum + (isExtended ? Number(s.night_hours) : effectiveNightHours(s)), 0),
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const isLocked = isPeriodLocked;
  const hasMultipleRestaurants = (restaurants?.length ?? 0) > 1;

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
      <ZtToolbar
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={(v) => { setSelectedPeriodId(v); setSelectedWeekId(""); setCumSelectedWeekNum(null); }}
        isLocked={isLocked}
        showCumulated={hasMultipleRestaurants}
        cumulated={cumulated}
        onCumulatedToggle={() => { setCumulated(prev => !prev); setCumSelectedWeekNum(null); }}
        weeks={effectiveWeeks}
        selectedWeekId={selectedWeekId}
        cumSelectedWeekNum={cumSelectedWeekNum}
        onWeekSelect={(id, num) => {
          if (cumulated) { setCumSelectedWeekNum(num); } else { setSelectedWeekId(id); }
        }}
        actions={
          <>
             <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!allPeriodShifts?.length || !employees?.length || !effectiveWeeks?.length} onClick={() => { const period = periods?.find(p => p.id === selectedPeriodId); if (!period || !employees || !effectiveWeeks || !allPeriodShifts) return; exportWochenplanPdf(period.label, employees, effectiveWeeks, allPeriodShifts, holidays ?? new Map(), sfnMode, holidayRatesMap); }}>
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!allPeriodShifts?.length || !employees?.length || !effectiveWeeks?.length} onClick={() => { const period = periods?.find(p => p.id === selectedPeriodId); if (!period || !employees || !effectiveWeeks || !allPeriodShifts) return; exportWochenplanExcel(period.label, employees, effectiveWeeks, allPeriodShifts, holidays ?? new Map(), sfnMode, holidayRatesMap); }}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
          </>
        }
      />

      {selectedWeek && weekDays.length > 0 && (() => {
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
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-destructive font-bold">{format(day, "EE", { locale: de })} {format(day, "dd.MM")}</span>
                            <span className="text-[10px] text-destructive/80 font-medium leading-tight">{holidayName}</span>
                          </div>
                        ) : (
                          <span className={`${!activeDates.has(dateStr) ? "text-muted-foreground" : ""}`}>{format(day, "EE", { locale: de })} {format(day, "dd.MM")}</span>
                        )}
                      </th>
                    );
                  })}
                   <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-l-2 border-primary/20 border-b border-border text-xs">Ges</th>
                   {showSfn && <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="evening" label="20-24" sfnMode={sfnMode} /></th>}
                   {showSfn && <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="night" label="24-x" sfnMode={sfnMode} /></th>}
                   {showSfn && (isExtended ? (
                     <>
                       <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="sonntag" label="So" sfnMode={sfnMode} /></th>
                       <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="feiertag" label="Fei 125%" sfnMode={sfnMode} /></th>
                       <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="feiertag" label="Fei 150%" sfnMode={sfnMode} /></th>
                     </>
                   ) : (
                     <th className="totals-header text-center p-1.5 font-semibold min-w-[50px] border-b border-border text-xs"><SfnTooltipHeader column="soFei" label="So/Fei" sfnMode={sfnMode} /></th>
                   ))}
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
                            colSpan={weekDays.length * 2 + 8}
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
                            <span className="truncate">{emp.nickname || (emp.name !== emp.first_name && emp.name !== emp.last_name ? emp.name : null) || emp.first_name || emp.name}</span>
                          </div>
                        </td>
                        {weekDays.map((day, dayIdx) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isActive = activeDates.has(dateStr);
                          const shift = isActive ? getShift(emp.id, dateStr, emp.department) : undefined;
                          const conflict = isActive ? getConflict(emp.id, dateStr, emp.department) : null;
                          const isSunHol = sundayHolidayDays.has(dateStr);
                          const isHoliday = holidayDays.has(dateStr);
                          const sunClass = isHoliday && isActive ? "sunday-col" : "";
                          const sepClass = dayIdx > 0 ? "day-separator" : "";
                          const absenceType = shift?.absence_type as string | null;
                          const startVal = shift?.start_time?.slice(0, 5) ?? "";
                          const endVal = shift?.end_time?.slice(0, 5) ?? "";
                          const cellDisabled = isLocked || !!conflict;
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
                              ) : conflict ? (
                                <>
                                  <td colSpan={2} className={`p-0.5 text-center bg-amber-50 dark:bg-amber-900/20 ${sunClass} ${sepClass}`}>
                                    <HoverCard openDelay={200}>
                                      <HoverCardTrigger asChild>
                                        <div className="inline-flex items-center justify-center h-7 w-full rounded text-xs text-muted-foreground cursor-not-allowed opacity-60">
                                          ✕
                                        </div>
                                      </HoverCardTrigger>
                                      <HoverCardContent side="bottom" className="w-auto min-w-[140px] p-3 text-xs">
                                        <p>Bereits in {conflict.department || "anderer Abteilung"} eingetragen</p>
                                        {(conflict as any).weeks?.scheduling_periods?.restaurants?.name && (
                                          <p className="text-muted-foreground mt-1">{(conflict as any).weeks.scheduling_periods.restaurants.name}</p>
                                        )}
                                      </HoverCardContent>
                                    </HoverCard>
                                  </td>
                                </>
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
                         {showSfn && <td className="totals-col text-center p-2 text-xs">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>}
                         {showSfn && <td className="totals-col text-center p-2 text-xs">{totals.night > 0 ? formatHours(totals.night) : ""}</td>}
                         {showSfn && (isExtended ? (
                           <>
                             <td className="totals-col text-center p-2 text-xs">{totals.sonntagStunden > 0 ? formatHours(totals.sonntagStunden) : ""}</td>
                             <td className="totals-col text-center p-2 text-xs">{totals.feiertag125Stunden > 0 ? formatHours(totals.feiertag125Stunden) : ""}</td>
                             <td className="totals-col text-center p-2 text-xs">{totals.feiertag150Stunden > 0 ? formatHours(totals.feiertag150Stunden) : ""}</td>
                           </>
                         ) : (
                           <td className="totals-col text-center p-2 text-xs">{totals.soFeiStunden > 0 ? formatHours(totals.soFeiStunden) : ""}</td>
                         ))}
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
