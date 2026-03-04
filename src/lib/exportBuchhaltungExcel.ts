import * as XLSX from "xlsx";
import { DEPARTMENT_ORDER, countVacationDays, countSickDays, formatHours, getSickDateRanges, getVacationDateRanges, formatSickRanges, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";

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
  total_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  night_hours: number;
  start_time: string | null;
  end_time: string | null;
  absence_type: string | null;
  shift_date?: string;
  department?: string | null;
}

interface PayrollNote {
  employee_id: string;
  vorschuss: number;
  urlaub_tage: number;
  besonderheiten: string | null;
}

export function exportBuchhaltungExcel(
  periodLabel: string,
  employees: Employee[],
  shifts: Shift[],
  payrollNotes: PayrollNote[]
) {
  const sorted = [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  const getTotals = (empId: string, department?: string) => {
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

  const wsData: (string | number)[][] = [];
  wsData.push([`Buchhaltung – ${periodLabel}`]);
  wsData.push([]);
  wsData.push(["Mitarbeiter", "Gesamt Std.", "Schichten", "20-24 Std.", "24-x Std.", "So Std.", "Fei Std.", "U (angr.)", "K", "Vorschuss", "Besonderheiten"]);

  let lastDept = "";
  for (const emp of sorted) {
    if (emp.department !== lastDept) {
      const row: (string | number)[] = new Array(11).fill("");
      row[0] = emp.department;
      wsData.push(row);
      lastDept = emp.department;
    }

    const t = getTotals(emp.id, emp.department);
    const note = payrollNotes.find((n) => n.employee_id === emp.id);

    const empShifts = shifts.filter((s) => s.employee_id === emp.id && s.department === emp.department);
    const sickRanges = getSickDateRanges(empShifts as any);
    const sickText = sickRanges.length > 0 ? `K: ${formatSickRanges(sickRanges).join(", ")}` : "";
    const vacRanges = getVacationDateRanges(empShifts as any);
    const vacText = vacRanges.length > 0 ? `U: ${formatSickRanges(vacRanges).join(", ")}` : "";
    const besText = [note?.besonderheiten, vacText, sickText].filter(Boolean).join(" | ");

    const nameParts = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name;
    const metaParts: string[] = [];
    if (emp.nickname) metaParts.push(emp.nickname);
    if (emp.perso_nr && emp.perso_nr > 0) metaParts.push(String(emp.perso_nr));
    const nameStr = metaParts.length > 0 ? `${nameParts} (${metaParts.join(" · ")})` : nameParts;

    wsData.push([
      nameStr,
      t.gesamt || "",
      t.schichten || "",
      t.evening || "",
      t.night || "",
      t.sonntagStunden || "",
      t.feiertagStunden || "",
      t.urlaubTage || "",
      t.krankTage || "",
      note?.vorschuss || "",
      besText,
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Buchhaltung");
  XLSX.writeFile(wb, `Buchhaltung_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
}
