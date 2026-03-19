import type * as XLSXType from "xlsx";
import { DEPARTMENT_ORDER, countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";
import type { SfnMode } from "@/hooks/useSfnMode";

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

function computeSfn(empShifts: Shift[], additive: boolean, holidayRates?: Map<string, number>) {
  let sonntagStunden = 0, feiertag125 = 0, feiertag150 = 0, soFeiStunden = 0;
  for (const s of empShifts) {
    const hrs = Number(s.sunday_holiday_hours);
    soFeiStunden += hrs;
    if (s.is_holiday) {
      const rate = holidayRates?.get(s.shift_date) ?? 1.25;
      if (rate >= 1.50) feiertag150 += hrs; else feiertag125 += hrs;
    } else sonntagStunden += hrs;
  }
  return {
    evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s, additive), 0),
    night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s, additive), 0),
    soFeiStunden, sonntagStunden, feiertag125, feiertag150,
  };
}

export async function exportZusammenfassungExcel(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  externalWeekNumberToIds?: Record<number, string[]>,
  sfnMode: SfnMode = "simple",
  holidayRates?: Map<string, number>
) {
  const XLSX: typeof XLSXType = await import("xlsx") as any;
  const additive = sfnMode === "extended";

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

  const getData = (empShifts: Shift[]) => {
    const sfn = computeSfn(empShifts, additive, holidayRates);
    return {
      ...sfn,
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const sfnHeaders = additive ? ["20-24", "24-x", "So", "Fei 125%", "Fei 150%"] : ["20-24", "24-x", "So/Fei"];
  function sfnCells(t: ReturnType<typeof getData>): (string | number)[] {
    if (additive) return [t.evening || "", t.night || "", t.sonntagStunden || "", t.feiertag125 || "", t.feiertag150 || ""];
    return [t.evening || "", t.night || "", t.soFeiStunden || ""];
  }

  const wsData: (string | number)[][] = [];
  wsData.push([`Zusammenfassung – ${periodLabel}`]);
  wsData.push([]);
  wsData.push(["Mitarbeiter", ...sortedWeeks.map(w => `W${w.week_number}`), "Gesamt", "Schichten", ...sfnHeaders, "U", "K"]);

  let lastDept = "";
  for (const emp of employeesWithShifts) {
    if (emp.department !== lastDept) {
      const emptyRow: (string | number)[] = new Array(sortedWeeks.length + 4 + sfnHeaders.length).fill("");
      emptyRow[0] = emp.department;
      wsData.push(emptyRow);
      lastDept = emp.department;
    }

    const empShifts = shifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
    const totals = getData(empShifts);
    const nicknameAlreadyInName = emp.nickname && (emp.first_name?.includes(emp.nickname) || emp.last_name?.includes(emp.nickname));
    const nameBase = emp.first_name || emp.last_name
      ? [emp.first_name, emp.nickname && !nicknameAlreadyInName ? `(${emp.nickname})` : null, emp.last_name].filter(Boolean).join(" ")
      : emp.name;
    const displayName = emp.perso_nr && emp.perso_nr > 0 ? `${nameBase} ${emp.perso_nr}` : nameBase;

    const weekCells = sortedWeeks.map(w => {
      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
      return h > 0 ? h : "";
    });

    wsData.push([displayName, ...weekCells, totals.gesamt, totals.schichten || "", ...sfnCells(totals), totals.urlaubTage || "", totals.krankTage || ""]);

    const idx = employeesWithShifts.indexOf(emp);
    const nextDept = idx < employeesWithShifts.length - 1 ? employeesWithShifts[idx + 1].department : null;
    if (emp.department !== nextDept) {
      const deptShifts = shifts.filter(s => s.department === emp.department);
      const dt = getData(deptShifts);
      wsData.push([`Summe ${emp.department}`, ...sortedWeeks.map(() => "" as string | number), dt.gesamt, dt.schichten || "", ...sfnCells(dt), dt.urlaubTage || "", dt.krankTage || ""]);
    }
  }

  // Grand total
  const grand = getData(shifts);
  wsData.push(["GESAMT", ...sortedWeeks.map(() => "" as string | number), grand.gesamt, grand.schichten || "", ...sfnCells(grand), grand.urlaubTage || "", grand.krankTage || ""]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 30 },
    ...sortedWeeks.map(() => ({ wch: 8 })),
    { wch: 10 }, { wch: 10 },
    ...sfnHeaders.map(() => ({ wch: 8 })),
    { wch: 6 }, { wch: 6 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Zusammenfassung");
  XLSX.writeFile(wb, `Zusammenfassung_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
}
