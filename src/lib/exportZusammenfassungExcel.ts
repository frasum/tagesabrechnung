import * as XLSX from "xlsx";
import { DEPARTMENT_ORDER, countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";

interface Employee {
  id: string;
  name: string;
  perso_nr: number | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  department: string;
}

interface Week {
  id: string;
  week_number: number;
}

interface Shift {
  employee_id: string;
  week_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  night_hours: number;
  absence_type: string | null;
  department: string | null;
}

export function exportZusammenfassungExcel(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  externalWeekNumberToIds?: Record<number, string[]>
) {
  const sorted = [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  const weekNumberToIds: Record<number, string[]> = externalWeekNumberToIds ?? (() => {
    const map: Record<number, string[]> = {};
    weeks.forEach(w => { (map[w.week_number] ??= []).push(w.id); });
    return map;
  })();

  const employeesWithShifts = sorted.filter((emp) =>
    shifts.some((s) => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weekNumberToIds[weekNumber] ?? [];
    return shifts
      .filter((s) => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department))
      .reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  const getEmpTotals = (empId: string, department?: string) => {
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
  };

  const getDeptTotals = (department: string) => {
    const deptShifts = shifts.filter((s) => s.department === department);
    return {
      gesamt: deptShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      sonntagStunden: deptShifts.reduce((sum, s) => sum + (s.is_holiday ? 0 : Number(s.sunday_holiday_hours)), 0),
      feiertagStunden: deptShifts.reduce((sum, s) => sum + (s.is_holiday ? Number(s.sunday_holiday_hours) : 0), 0),
      evening: deptShifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
      night: deptShifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
      schichten: deptShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(deptShifts),
      krankTage: countSickDays(deptShifts),
    };
  };

  const wsData: (string | number)[][] = [];

  // Title
  wsData.push([`Zusammenfassung – ${periodLabel}`]);
  wsData.push([]);

  // Header
  wsData.push(["Mitarbeiter", ...sortedWeeks.map(w => `W${w.week_number}`), "Gesamt", "Schichten", "20-24", "24-x", "So", "Fei", "U", "K"]);

  let lastDept = "";
  for (const emp of employeesWithShifts) {
    if (emp.department !== lastDept) {
      const emptyRow: (string | number)[] = new Array(sortedWeeks.length + 9).fill("");
      emptyRow[0] = emp.department;
      wsData.push(emptyRow);
      lastDept = emp.department;
    }

    const totals = getEmpTotals(emp.id, emp.department);
    const displayName = `${emp.perso_nr ? emp.perso_nr + " " : ""}${emp.nickname ? emp.nickname + " - " : ""}${[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name}`;

    const weekCells = sortedWeeks.map(w => {
      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
      return h > 0 ? h : "";
    });

    wsData.push([
      displayName,
      ...weekCells,
      totals.gesamt,
      totals.schichten || "",
      totals.evening || "",
      totals.night || "",
      totals.sonntagStunden || "",
      totals.feiertagStunden || "",
      totals.urlaubTage || "",
      totals.krankTage || "",
    ]);

    // Subtotal
    const idx = employeesWithShifts.indexOf(emp);
    const nextDept = idx < employeesWithShifts.length - 1 ? employeesWithShifts[idx + 1].department : null;
    if (emp.department !== nextDept) {
      const dt = getDeptTotals(emp.department);
      wsData.push([
        `Summe ${emp.department}`,
        ...sortedWeeks.map(() => "" as string | number),
        dt.gesamt,
        dt.schichten || "",
        dt.evening || "",
        dt.night || "",
        dt.sonntagStunden || "",
        dt.feiertagStunden || "",
        dt.urlaubTage || "",
        dt.krankTage || "",
      ]);
    }
  }

  // Grand total
  const grand = {
    gesamt: shifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
    sonntagStunden: shifts.reduce((sum, s) => sum + (s.is_holiday ? 0 : Number(s.sunday_holiday_hours)), 0),
    feiertagStunden: shifts.reduce((sum, s) => sum + (s.is_holiday ? Number(s.sunday_holiday_hours) : 0), 0),
    evening: shifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
    night: shifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
    schichten: shifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
    urlaubTage: countVacationDays(shifts),
    krankTage: countSickDays(shifts),
  };

  wsData.push([
    "GESAMT",
    ...sortedWeeks.map(() => "" as string | number),
    grand.gesamt,
    grand.schichten || "",
    grand.evening || "",
    grand.night || "",
    grand.sonntagStunden || "",
    grand.feiertagStunden || "",
    grand.urlaubTage || "",
    grand.krankTage || "",
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 30 },
    ...sortedWeeks.map(() => ({ wch: 8 })),
    { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Zusammenfassung");
  XLSX.writeFile(wb, `Zusammenfassung_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
}
