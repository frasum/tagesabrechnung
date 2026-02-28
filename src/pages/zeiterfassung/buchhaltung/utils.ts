import { countVacationDays, countSickDays } from "@/lib/shiftCalculations";
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
    soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
    evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
    night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
    schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
    urlaubTage: countVacationDays(empShifts),
    krankTage: countSickDays(empShifts),
  };
}
