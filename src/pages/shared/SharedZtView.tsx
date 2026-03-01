import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
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

type SharedData = {
  period: { id: string; label: string; start_date: string; end_date: string; status: string };
  weeks: { id: string; period_id: string; week_number: number; start_date: string; end_date: string }[];
  shifts: Shift[];
  employees: { id: string; name: string; perso_nr: number | null; first_name: string | null; last_name: string | null; nickname: string | null; department: string }[];
  payrollNotes: PayrollNote[];
  advances: AdvanceEntry[];
  holidays: { holiday_date: string; name: string }[];
};

export default function SharedZtView() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("wochenplan");
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");

  const { data, isLoading, error } = useQuery<SharedData>({
    queryKey: ["shared-zt", token],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-zt-data?token=${token}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Laden");
      }
      return res.json();
    },
    enabled: !!token,
  });

  // Auto-select first week
  React.useEffect(() => {
    if (data?.weeks?.length && !selectedWeekId) {
      setSelectedWeekId(data.weeks[0].id);
    }
  }, [data?.weeks, selectedWeekId]);

  const upsertNote = useMutation({
    mutationFn: async (params: { employee_id: string; field: string; value: any }) => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-zt-data?token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(params),
        }
      );
      if (!res.ok) throw new Error("Fehler beim Speichern");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-zt", token] });
      toast.success("Gespeichert");
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <Sonner />
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Ungültiger Link</h1>
        <p className="text-muted-foreground text-center">
          Dieser Freigabe-Link ist ungültig oder wurde widerrufen.
        </p>
      </div>
    );
  }

  const { period, weeks, shifts, employees, payrollNotes, advances, holidays } = data;
  const holidayMap = new Map(holidays.map(h => [h.holiday_date, h.name]));

  const sortedEmployees = [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  const employeesWithShifts = sortedEmployees.filter((emp) =>
    shifts.some((s) => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  return (
    <div className="min-h-screen bg-background">
      <Sonner />
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Zeiterfassung — {period.label}</h1>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(period.start_date), "dd.MM.yyyy", { locale: de })} — {format(parseISO(period.end_date), "dd.MM.yyyy", { locale: de })}
            </p>
          </div>
          <Badge variant={period.status === "open" ? "default" : "secondary"}>
            {period.status === "open" ? "Offen" : "Gesperrt"}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wochenplan">Wochenplan</TabsTrigger>
            <TabsTrigger value="zusammenfassung">Zusammenfassung</TabsTrigger>
            <TabsTrigger value="buchhaltung">Buchhaltung</TabsTrigger>
          </TabsList>

          <TabsContent value="wochenplan">
            <WochenplanTab
              weeks={weeks}
              shifts={shifts}
              employees={sortedEmployees}
              holidays={holidayMap}
              periodLabel={period.label}
              selectedWeekId={selectedWeekId}
              onSelectWeek={setSelectedWeekId}
            />
          </TabsContent>

          <TabsContent value="zusammenfassung">
            <ZusammenfassungTab
              weeks={weeks}
              shifts={shifts}
              employees={employeesWithShifts}
              periodLabel={period.label}
            />
          </TabsContent>

          <TabsContent value="buchhaltung">
            <BuchhaltungTab
              shifts={shifts}
              employees={employeesWithShifts}
              payrollNotes={payrollNotes}
              advances={advances}
              periodLabel={period.label}
              isLocked={period.status === "locked"}
              onUpsertNote={(p) => upsertNote.mutate(p)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ========== Wochenplan Tab ==========
function WochenplanTab({ weeks, shifts, employees, holidays, periodLabel, selectedWeekId, onSelectWeek }: {
  weeks: SharedData["weeks"];
  shifts: Shift[];
  employees: SharedData["employees"];
  holidays: Map<string, string>;
  periodLabel: string;
  selectedWeekId: string;
  onSelectWeek: (id: string) => void;
}) {
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

  const weekShifts = shifts.filter(s => s.week_id === selectedWeekId);
  const allPeriodShifts = shifts;
  const weekIds = weeks.map(w => w.id);

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
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!allPeriodShifts.length} onClick={() => exportWochenplanPdf(periodLabel, employees, weeks, allPeriodShifts as any, holidays)}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!allPeriodShifts.length} onClick={() => exportWochenplanExcel(periodLabel, employees, weeks, allPeriodShifts as any, holidays)}>
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
                {weekDays.map((day, i) => {
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
              {employees.map(emp => {
                const empWeekShifts = weekShifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
                const weekTotal = empWeekShifts.reduce((sum, s) => sum + Number(s.total_hours), 0);
                if (weekTotal === 0 && !empWeekShifts.some(s => s.absence_type)) return null;

                return (
                  <tr key={`${emp.id}-${emp.department}`} className="border-t hover:bg-muted/30">
                    <td className="p-1.5 font-medium text-xs whitespace-nowrap">
                      {emp.nickname || emp.first_name || emp.name}
                    </td>
                    {weekDays.map(day => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const shift = empWeekShifts.find(s => s.shift_date === dateStr);
                      if (!activeDates.has(dateStr)) return <td key={dateStr} colSpan={2} className="opacity-40" />;
                      if (shift?.absence_type) {
                        return (
                          <td key={dateStr} colSpan={2} className="text-center text-xs p-1">
                            <Badge variant="outline" className="text-[10px]">
                              {shift.absence_type === "urlaub" ? "U" : "K"}
                            </Badge>
                          </td>
                        );
                      }
                      return (
                        <React.Fragment key={dateStr}>
                          <td className="text-center text-xs p-0.5 text-muted-foreground">{shift?.start_time?.slice(0, 5) || ""}</td>
                          <td className="text-center text-xs p-0.5 text-muted-foreground">{shift?.end_time?.slice(0, 5) || ""}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="text-center p-1.5 font-medium text-xs">{weekTotal > 0 ? formatHours(weekTotal) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ========== Zusammenfassung Tab ==========
function ZusammenfassungTab({ weeks, shifts, employees, periodLabel }: {
  weeks: SharedData["weeks"];
  shifts: Shift[];
  employees: SharedData["employees"];
  periodLabel: string;
}) {
  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weeks.filter(w => w.week_number === weekNumber).map(w => w.id);
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
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungPdf(periodLabel, employees, weeks, shifts as any)}>
          <FileDown className="mr-1 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" disabled={!employees.length} onClick={() => exportZusammenfassungExcel(periodLabel, employees, weeks, shifts as any)}>
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

// ========== Buchhaltung Tab ==========
function BuchhaltungTab({ shifts, employees, payrollNotes, advances, periodLabel, isLocked, onUpsertNote }: {
  shifts: Shift[];
  employees: SharedData["employees"];
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
