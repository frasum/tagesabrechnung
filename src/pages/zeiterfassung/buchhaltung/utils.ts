import { countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours } from "@/lib/shiftCalculations";
import type { Shift, EmployeeTotals } from "./types";

export function getDeptBorderClass(dept: string): string {
  switch (dept) {
    case "Küche": return "border-l-[hsl(var(--dept-kueche))]";
    case "GL": return "border-l-[hsl(var(--dept-gl))]";
    case "Service": return "border-l-[hsl(var(--dept-service))]";
    default: return "border-l-muted-foreground";
  }
}

export function displayNum(val: number, formatter?: (v: number) => string): string {
  if (!val || val === 0) return "–";
  return formatter ? formatter(val) : String(val);
}

export function getEmployeeTotals(empId: string, shifts: Shift[], department?: string): EmployeeTotals {
  const empShifts = shifts.filter((s) => s.employee_id === empId && (!department || s.department === department));
  return {
    gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
    sonntagStunden: empShifts.reduce((sum, s) => sum + (s.is_holiday ? 0 : Number(s.sunday_holiday_hours)), 0),
    feiertagStunden: empShifts.reduce((sum, s) => sum + (s.is_holiday ? Number(s.sunday_holiday_hours) : 0), 0),
    evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
    night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
    schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
    urlaubTage: countVacationDays(empShifts),
    krankTage: countSickDays(empShifts),
  };
}
