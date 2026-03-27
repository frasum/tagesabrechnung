import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Loader2, EyeOff, Eye, Search, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateShiftHours } from "@/lib/shiftCalculations";
import { toast } from "@/hooks/use-toast";

const HIDDEN_STORAGE_KEY = "zt-shift-override-hidden";

function loadHiddenIds(): Set<string> {
  try {
    const stored = localStorage.getItem(HIDDEN_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHiddenIds(ids: Set<string>) {
  localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function getEmployeeLabel(emp: Employee): string {
  const nick = emp.nickname ? `${emp.nickname} – ` : "";
  const name = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name;
  const dept = emp.department ? ` (${emp.department})` : "";
  return `${nick}${name}${dept}`;
}

function matchesSearch(emp: Employee, search: string): boolean {
  if (!search) return true;
  const s = search.toLowerCase();
  return getEmployeeLabel(emp).toLowerCase().includes(s);
}

interface Employee {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  department?: string | null;
}

interface Week {
  id: string;
  start_date: string;
  end_date: string;
  week_number: number;
}

interface ShiftTimeOverrideProps {
  employeesWithShifts: Employee[];
  allEmployees: Employee[];
  dailyEmployees?: Employee[];
  weekIds: string[];
  weeks: Week[];
  periodStartDate?: string;
  periodEndDate?: string;
}

/** Generate all dates between start and end (inclusive) */
function getAllDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Generate all dates Mon-Fri between start and end (inclusive) */
function getWeekdayDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  while (current <= end) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Find which week a date belongs to */
function findWeekForDate(date: string, weeks: Week[]): Week | undefined {
  return weeks.find((w) => date >= w.start_date && date <= w.end_date);
}

export default function ShiftTimeOverride({
  employeesWithShifts,
  allEmployees,
  dailyEmployees = [],
  weekIds,
  weeks,
  periodStartDate,
  periodEndDate,
}: ShiftTimeOverrideProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generateIds, setGenerateIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyIds, setDailyIds] = useState<Set<string>>(new Set());
  const [isDailyGenerating, setIsDailyGenerating] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(loadHiddenIds);
  const [showHidden, setShowHidden] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleHidden = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveHiddenIds(next);
      return next;
    });
  }, []);

  // Deduplicate employees by id
  const uniqueEmployees = React.useMemo(() => {
    const map = new Map<string, Employee>();
    employeesWithShifts.forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [employeesWithShifts]);

  const uniqueAllEmployees = React.useMemo(() => {
    const map = new Map<string, Employee>();
    allEmployees.forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [allEmployees]);

  const uniqueDailyEmployees = React.useMemo(() => {
    const map = new Map<string, Employee>();
    dailyEmployees.forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [dailyEmployees]);

  // Load holidays for the period range
  const { data: holidays } = useQuery({
    queryKey: ["bavarian-holidays", periodStartDate, periodEndDate],
    queryFn: async () => {
      if (!periodStartDate || !periodEndDate) return [];
      const { data, error } = await supabase
        .from("bavarian_holidays")
        .select("holiday_date")
        .gte("holiday_date", periodStartDate)
        .lte("holiday_date", periodEndDate);
      if (error) throw error;
      return data.map((h) => h.holiday_date);
    },
    enabled: !!periodStartDate && !!periodEndDate,
  });

  const holidaySet = React.useMemo(() => new Set(holidays ?? []), [holidays]);

  // --- Section 1: Override existing shifts ---
  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === uniqueEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uniqueEmployees.map((e) => e.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setIsUpdating(true);
    try {
      const { data: shifts, error } = await supabase
        .from("zt_shifts")
        .select("*")
        .in("week_id", weekIds)
        .in("employee_id", Array.from(selectedIds));
      if (error) throw error;

      const editableShifts = (shifts ?? []).filter(
        (s) => s.start_time && s.end_time && !s.absence_type
      );

      if (editableShifts.length === 0) {
        toast({ title: "Keine anpassbaren Schichten gefunden." });
        setIsUpdating(false);
        return;
      }

      let updated = 0;
      for (const shift of editableShifts) {
        const date = shift.shift_date;
        const dayOfWeek = new Date(date + "T12:00:00").getDay();
        const isSundayOrHoliday = dayOfWeek === 0 || holidaySet.has(date);
        const newStart = isSundayOrHoliday ? "15:00" : "17:00";
        const newEnd = isSundayOrHoliday ? "02:00" : "01:00";
        const hours = calculateShiftHours(newStart, newEnd, isSundayOrHoliday);

        const { error: updateError } = await supabase
          .from("zt_shifts")
          .update({
            start_time: newStart,
            end_time: newEnd,
            total_hours: hours.totalHours,
            evening_hours: hours.eveningHours,
            night_hours: hours.nightHours,
            night_deep_hours: hours.nightDeepHours,
            sunday_holiday_hours: hours.sundayHolidayHours,
            is_holiday: holidaySet.has(date),
          })
          .eq("id", shift.id);
        if (updateError) throw updateError;
        updated++;
      }

      toast({
        title: `${updated} Schichten angepasst`,
        description: "Die Zeiten wurden erfolgreich überschrieben.",
      });
      queryClient.invalidateQueries({ queryKey: ["zt-summary-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts"] });
    } catch (err: any) {
      toast({ title: "Fehler beim Anpassen", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Section 2: Generate Mo-Fr shifts ---
  const toggleGenerate = (id: string) => {
    setGenerateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllGenerate = () => {
    if (generateIds.size === uniqueAllEmployees.length) {
      setGenerateIds(new Set());
    } else {
      setGenerateIds(new Set(uniqueAllEmployees.map((e) => e.id)));
    }
  };

  const handleGenerate = async () => {
    if (generateIds.size === 0 || weeks.length === 0) return;
    setIsGenerating(true);
    try {
      // Collect all Mo-Fr dates across all weeks, excluding holidays
      const allDates: { date: string; week: Week }[] = [];
      for (const week of weeks) {
        const weekdayDates = getWeekdayDates(week.start_date, week.end_date);
        for (const d of weekdayDates) {
          allDates.push({ date: d, week });
        }
      }

      if (allDates.length === 0) {
        toast({ title: "Keine Wochentage in der Periode gefunden." });
        setIsGenerating(false);
        return;
      }

      const selectedEmps = uniqueAllEmployees.filter((e) => generateIds.has(e.id));
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const emp of selectedEmps) {
        const department = emp.department || "";

        // Load existing shifts for this employee in the period
        const { data: existing, error: loadErr } = await supabase
          .from("zt_shifts")
          .select("id, shift_date, week_id")
          .in("week_id", weekIds)
          .eq("employee_id", emp.id)
          .eq("department", department);
        if (loadErr) throw loadErr;

        const existingByDate = new Map((existing ?? []).map((s) => [s.shift_date, s]));

        for (const { date, week } of allDates) {
          const isHoliday = holidaySet.has(date);
          const hours = calculateShiftHours("17:00", "01:00", isHoliday);
          // Conflict check
          const { data: allShiftsOnDay } = await supabase
            .from("zt_shifts")
            .select("id, department, week_id, start_time, absence_type, total_hours")
            .eq("employee_id", emp.id)
            .eq("shift_date", date);
          const hasConflict = allShiftsOnDay?.some(s =>
            s.week_id !== week.id &&
            (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0)
          );
          if (hasConflict) { skipped++; continue; }

          const existingShift = existingByDate.get(date);
          if (existingShift) {
            const { error: upErr } = await supabase
              .from("zt_shifts")
              .update({
                start_time: "17:00",
                end_time: "01:00",
                total_hours: hours.totalHours,
                evening_hours: hours.eveningHours,
                night_hours: hours.nightHours,
                night_deep_hours: hours.nightDeepHours,
                sunday_holiday_hours: hours.sundayHolidayHours,
                is_holiday: isHoliday,
              })
              .eq("id", existingShift.id);
            if (upErr) throw upErr;
            updated++;
          } else {
            const { error: insErr } = await supabase
              .from("zt_shifts")
              .insert({
                week_id: week.id,
                employee_id: emp.id,
                shift_date: date,
                department,
                start_time: "17:00",
                end_time: "01:00",
                total_hours: hours.totalHours,
                evening_hours: hours.eveningHours,
                night_hours: hours.nightHours,
                night_deep_hours: hours.nightDeepHours,
                sunday_holiday_hours: hours.sundayHolidayHours,
                is_holiday: isHoliday,
              });
            if (insErr) throw insErr;
            created++;
          }
        }
      }

      toast({
        title: `${created} Schichten erzeugt, ${updated} aktualisiert${skipped > 0 ? `, ${skipped} übersprungen` : ""}`,
        description: skipped > 0
          ? `Mo–Fr 17:00–01:00. ${skipped} Tag(e) übersprungen (Schicht in anderem Department/Restaurant).`
          : "Mo–Fr 17:00–01:00 für die gesamte Periode.",
      });
      queryClient.invalidateQueries({ queryKey: ["zt-summary-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts"] });
    } catch (err: any) {
      toast({ title: "Fehler beim Erzeugen", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Section 3: Generate daily (Mo-So) shifts ---
  const toggleDaily = (id: string) => {
    setDailyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllDaily = () => {
    if (dailyIds.size === uniqueDailyEmployees.length) {
      setDailyIds(new Set());
    } else {
      setDailyIds(new Set(uniqueDailyEmployees.map((e) => e.id)));
    }
  };

  const handleDailyGenerate = async () => {
    if (dailyIds.size === 0 || weeks.length === 0) return;
    setIsDailyGenerating(true);
    try {
      // Collect ALL dates across all weeks
      const allDates: { date: string; week: Week }[] = [];
      for (const week of weeks) {
        const dates = getAllDates(week.start_date, week.end_date);
        for (const d of dates) {
          allDates.push({ date: d, week });
        }
      }

      if (allDates.length === 0) {
        toast({ title: "Keine Tage in der Periode gefunden." });
        setIsDailyGenerating(false);
        return;
      }

      const selectedEmps = uniqueDailyEmployees.filter((e) => dailyIds.has(e.id));
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const emp of selectedEmps) {
        const department = emp.department || "";

        const { data: existing, error: loadErr } = await supabase
          .from("zt_shifts")
          .select("id, shift_date, week_id")
          .in("week_id", weekIds)
          .eq("employee_id", emp.id)
          .eq("department", department);
        if (loadErr) throw loadErr;

        const existingByDate = new Map((existing ?? []).map((s) => [s.shift_date, s]));

        for (const { date, week } of allDates) {
          // Conflict check: shift in another dept/week?
          const { data: allShiftsOnDay } = await supabase
            .from("zt_shifts")
            .select("id, department, week_id, start_time, absence_type, total_hours")
            .eq("employee_id", emp.id)
            .eq("shift_date", date);
          const hasConflict = allShiftsOnDay?.some(s =>
            s.week_id !== week.id &&
            (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0)
          );
          if (hasConflict) { skipped++; continue; }

          const dayOfWeek = new Date(date + "T12:00:00").getDay();
          const isSundayOrHoliday = dayOfWeek === 0 || holidaySet.has(date);
          const hours = calculateShiftHours("17:00", "01:00", isSundayOrHoliday);

          const existingShift = existingByDate.get(date);
          if (existingShift) {
            const { error: upErr } = await supabase
              .from("zt_shifts")
              .update({
                start_time: "17:00",
                end_time: "01:00",
                total_hours: hours.totalHours,
                evening_hours: hours.eveningHours,
                night_hours: hours.nightHours,
                night_deep_hours: hours.nightDeepHours,
                sunday_holiday_hours: hours.sundayHolidayHours,
                is_holiday: holidaySet.has(date),
                absence_type: null,
              })
              .eq("id", existingShift.id);
            if (upErr) throw upErr;
            updated++;
          } else {
            const { error: insErr } = await supabase
              .from("zt_shifts")
              .insert({
                week_id: week.id,
                employee_id: emp.id,
                shift_date: date,
                department,
                start_time: "17:00",
                end_time: "01:00",
                total_hours: hours.totalHours,
                evening_hours: hours.eveningHours,
                night_hours: hours.nightHours,
                night_deep_hours: hours.nightDeepHours,
                sunday_holiday_hours: hours.sundayHolidayHours,
                is_holiday: holidaySet.has(date),
              });
            if (insErr) throw insErr;
            created++;
          }
        }
      }

      toast({
        title: `${created} Schichten erzeugt, ${updated} aktualisiert${skipped > 0 ? `, ${skipped} übersprungen` : ""}`,
        description: skipped > 0
          ? `Mo–So 17:00–01:00. ${skipped} Tag(e) übersprungen (Schicht in anderem Department/Restaurant).`
          : "Mo–So 17:00–01:00 für die gesamte Periode.",
      });
      queryClient.invalidateQueries({ queryKey: ["zt-summary-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts"] });
    } catch (err: any) {
      toast({ title: "Fehler beim Erzeugen", description: err.message, variant: "destructive" });
    } finally {
      setIsDailyGenerating(false);
    }
  };

  if (uniqueEmployees.length === 0 && uniqueAllEmployees.length === 0 && uniqueDailyEmployees.length === 0) return null;

  const hiddenCount = hiddenIds.size;

  const filterList = (list: Employee[]) =>
    list.filter((e) => (showHidden || !hiddenIds.has(e.id)) && matchesSearch(e, searchTerm));

  const visibleEmployees = filterList(uniqueEmployees);
  const visibleAllEmployees = filterList(uniqueAllEmployees);
  const visibleDailyEmployees = filterList(uniqueDailyEmployees);

  const allSelected = selectedIds.size === visibleEmployees.length && visibleEmployees.length > 0;
  const allGenerateSelected = generateIds.size === visibleAllEmployees.length && visibleAllEmployees.length > 0;
  const allDailySelected = dailyIds.size === visibleDailyEmployees.length && visibleDailyEmployees.length > 0;

  const renderEmployeeRow = (emp: Employee, prefix: string, checkedSet: Set<string>, toggleFn: (id: string) => void) => {
    const isHidden = hiddenIds.has(emp.id);
    return (
      <div key={emp.id} className={`flex items-center gap-2 ${isHidden ? "opacity-50" : ""}`}>
        <Checkbox
          id={`${prefix}-${emp.id}`}
          checked={checkedSet.has(emp.id)}
          onCheckedChange={() => toggleFn(emp.id)}
          disabled={isHidden}
        />
        <Label htmlFor={`${prefix}-${emp.id}`} className={`text-sm cursor-pointer flex-1 ${isHidden ? "line-through" : ""}`}>
          {getEmployeeLabel(emp)}
        </Label>
        <button
          type="button"
          onClick={() => toggleHidden(emp.id)}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isHidden ? "Einblenden" : "Ausblenden"}
        >
          {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  };


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Schichtzeiten anpassen (Admin)
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Unter der Woche: <span className="font-medium text-foreground">17:00 – 01:00</span></p>
          <p>Sonn-/Feiertage: <span className="font-medium text-foreground">15:00 – 02:00</span></p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter suchen…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <Button
            variant={showHidden ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowHidden((v) => !v)}
            className="gap-1.5"
          >
            {showHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showHidden ? "Ausgeblendete verbergen" : "Ausgeblendete anzeigen"}
            {hiddenCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {hiddenCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Section 1: Override existing */}
        {visibleEmployees.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bestehende Schichten überschreiben</p>
              <p className="text-xs text-muted-foreground">
                Überschreibt die Zeiten aller vorhandenen Schichten (mit Start-/Endzeit, ohne Abwesenheit) auf die Standardwerte. Es werden keine neuen Schichten erzeugt.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {visibleEmployees.map((emp) => renderEmployeeRow(emp, "override", selectedIds, toggleEmployee))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected ? "Keine auswählen" : "Alle auswählen"}
                </Button>
                <Button size="sm" disabled={selectedIds.size === 0 || isUpdating} onClick={handleApply}>
                  {isUpdating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Zeiten anpassen
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Section 2: Generate Mo-Fr shifts */}
        {visibleAllEmployees.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mo–Fr Schichten erzeugen & anpassen</p>
              <p className="text-xs text-muted-foreground">
                Erzeugt fehlende Mo–Fr Einträge mit 17:00–01:00 für die gesamte Periode (inkl. Feiertage unter der Woche).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {visibleAllEmployees.map((emp) => renderEmployeeRow(emp, "generate", generateIds, toggleGenerate))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAllGenerate}>
                  {allGenerateSelected ? "Keine auswählen" : "Alle auswählen"}
                </Button>
                <Button size="sm" disabled={generateIds.size === 0 || isGenerating} onClick={handleGenerate}>
                  {isGenerating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Schichten erzeugen
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Section 3: Generate daily Mo-So shifts */}
        {visibleDailyEmployees.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tägliche Schichten erzeugen (Mo–So)</p>
              <p className="text-xs text-muted-foreground">
                Erzeugt/überschreibt Einträge mit 17:00–01:00 für jeden Tag der Periode (inkl. Wochenende).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {visibleDailyEmployees.map((emp) => renderEmployeeRow(emp, "daily", dailyIds, toggleDaily))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleAllDaily}>
                  {allDailySelected ? "Keine auswählen" : "Alle auswählen"}
                </Button>
                <Button size="sm" disabled={dailyIds.size === 0 || isDailyGenerating} onClick={handleDailyGenerate}>
                  {isDailyGenerating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Schichten erzeugen
                </Button>
              </div>
            </div>
          </>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
