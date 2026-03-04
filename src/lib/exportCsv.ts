import { DEPARTMENT_ORDER, countVacationDays, countSickDays, getSickDateRanges, getVacationDateRanges, formatSickRanges } from "./shiftCalculations";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";

// --- Generic CSV download helper ---

function csvValue(val: string | number): string {
  if (typeof val === "number") {
    return val === 0 ? "" : String(val).replace(".", ",");
  }
  const s = String(val ?? "");
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = "\uFEFF";
  const headerLine = headers.map(csvValue).join(";");
  const dataLines = rows.map(row => row.map(csvValue).join(";"));
  const content = bom + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Types (matching Excel exports) ---

interface Employee {
  id: string;
  name: string;
  perso_nr: number | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  department: string;
}

interface Shift {
  employee_id: string;
  week_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number;
  sunday_holiday_hours: number;
  evening_hours: number;
  night_hours: number;
  absence_type: string | null;
  department?: string | null;
}

interface PayrollNote {
  employee_id: string;
  vorschuss: number;
  urlaub_tage: number;
  besonderheiten: string | null;
}

interface Week {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
}

// --- Sorting helper ---

function sortEmployees(employees: Employee[]) {
  return [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });
}

function empDisplayName(emp: Employee): string {
  const nameParts = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name;
  const meta: string[] = [];
  if (emp.nickname) meta.push(emp.nickname);
  if (emp.perso_nr && emp.perso_nr > 0) meta.push(String(emp.perso_nr));
  return meta.length > 0 ? `${nameParts} (${meta.join(" · ")})` : nameParts;
}

// ============ 1. Buchhaltung CSV ============

export function exportBuchhaltungCsv(
  periodLabel: string,
  employees: Employee[],
  shifts: Shift[],
  payrollNotes: PayrollNote[]
) {
  const sorted = sortEmployees(employees);
  const headers = ["Mitarbeiter", "Abteilung", "Gesamt Std.", "Schichten", "20-24", "24-x", "So/Fei", "Urlaub", "Krank", "Vorschuss", "Besonderheiten"];
  const rows: (string | number)[][] = [];

  for (const emp of sorted) {
    const empShifts = shifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
    const t = {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
    const note = payrollNotes.find(n => n.employee_id === emp.id);

    const sickRanges = getSickDateRanges(empShifts as any);
    const sickText = sickRanges.length > 0 ? `K: ${formatSickRanges(sickRanges).join(", ")}` : "";
    const vacRanges = getVacationDateRanges(empShifts as any);
    const vacText = vacRanges.length > 0 ? `U: ${formatSickRanges(vacRanges).join(", ")}` : "";
    const besText = [note?.besonderheiten, vacText, sickText].filter(Boolean).join(" | ");

    rows.push([
      empDisplayName(emp),
      emp.department,
      t.gesamt,
      t.schichten,
      t.evening,
      t.night,
      t.soFei,
      t.urlaubTage,
      t.krankTage,
      note?.vorschuss || 0,
      besText,
    ]);
  }

  downloadCsv(`Buchhaltung_${periodLabel.replace(/\s+/g, "_")}.csv`, headers, rows);
}

// ============ 2. Zusammenfassung CSV ============

export function exportZusammenfassungCsv(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  externalWeekNumberToIds?: Record<number, string[]>
) {
  const sorted = sortEmployees(employees);
  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  const weekNumberToIds: Record<number, string[]> = externalWeekNumberToIds ?? (() => {
    const map: Record<number, string[]> = {};
    weeks.forEach(w => { (map[w.week_number] ??= []).push(w.id); });
    return map;
  })();

  const employeesWithShifts = sorted.filter(emp =>
    shifts.some(s => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  const headers = ["Mitarbeiter", "Abteilung", ...sortedWeeks.map(w => `W${w.week_number}`), "Gesamt", "Schichten", "20-24", "24-x", "So/Fei", "U", "K"];
  const rows: (string | number)[][] = [];

  for (const emp of employeesWithShifts) {
    const empShifts = shifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
    const totals = {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };

    const weekCells = sortedWeeks.map(w => {
      const wIds = weekNumberToIds[w.week_number] ?? [];
      return shifts
        .filter(s => s.employee_id === emp.id && wIds.includes(s.week_id) && s.department === emp.department)
        .reduce((sum, s) => sum + Number(s.total_hours), 0);
    });

    rows.push([
      empDisplayName(emp),
      emp.department,
      ...weekCells,
      totals.gesamt,
      totals.schichten,
      totals.evening,
      totals.night,
      totals.soFei,
      totals.urlaubTage,
      totals.krankTage,
    ]);
  }

  downloadCsv(`Zusammenfassung_${periodLabel.replace(/\s+/g, "_")}.csv`, headers, rows);
}

// ============ 3. Wochenplan CSV ============

function fmtTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5).replace(/^0/, "");
}

export function exportWochenplanCsv(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  holidays: Map<string, string>
) {
  const sorted = sortEmployees(employees);
  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  const allRows: (string | number)[][] = [];
  const allHeaders: string[] = [];

  for (let wi = 0; wi < sortedWeeks.length; wi++) {
    const week = sortedWeeks[wi];
    const days = eachDayOfInterval({ start: parseISO(week.start_date), end: parseISO(week.end_date) });
    const dayStrs = days.map(d => format(d, "yyyy-MM-dd"));
    const weekDayStrs = new Set(dayStrs);
    const weekShifts = shifts.filter(s => weekDayStrs.has(s.shift_date));

    if (wi === 0) {
      const dayHeaders = days.flatMap(d => {
        const label = `${format(d, "EE", { locale: de })} ${format(d, "dd.MM.")}`;
        return [`${label} Von`, `${label} Bis`, `${label} Std.`, `${label} Abw.`];
      });
      allHeaders.push("Mitarbeiter", "Abteilung", ...dayHeaders);
    }

    // Add a separator row for each week
    if (wi > 0) {
      allRows.push([`--- Woche ${week.week_number} ---`]);
    }

    for (const emp of sorted) {
      const empShifts = weekShifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
      if (!empShifts.length && !weekShifts.some(s => s.employee_id === emp.id)) continue;

      const dayCells = dayStrs.flatMap(dateStr => {
        const shift = empShifts.find(s => s.shift_date === dateStr);
        if (!shift) return ["", "", "", ""];
        if (shift.absence_type === "urlaub") return ["", "", "", "U"];
        if (shift.absence_type === "krank") return ["", "", "", "K"];
        return [
          fmtTime(shift.start_time),
          fmtTime(shift.end_time),
          Number(shift.total_hours),
          "",
        ];
      });

      allRows.push([empDisplayName(emp), emp.department, ...dayCells]);
    }
  }

  downloadCsv(`Wochenplan_${periodLabel.replace(/\s+/g, "_")}.csv`, allHeaders, allRows);
}
