import type * as XLSXType from "xlsx";
import { DEPARTMENT_ORDER, countVacationDays, countSickDays, formatHours, getSickDateRanges, getVacationDateRanges, formatSickRanges, formatVacationRanges, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";
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

function computeSfn(empShifts: Shift[], additive: boolean, holidayRates?: Map<string, number>) {
  let sonntagStunden = 0, feiertag125 = 0, feiertag150 = 0, soFeiStunden = 0;
  for (const s of empShifts) {
    const hrs = Number(s.sunday_holiday_hours);
    soFeiStunden += hrs;
    if (s.is_holiday) {
      const rate = holidayRates?.get(s.shift_date ?? "") ?? 1.25;
      if (rate >= 1.50) feiertag150 += hrs; else feiertag125 += hrs;
    } else sonntagStunden += hrs;
  }
  return {
    evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s, additive), 0),
    night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s, additive), 0),
    soFeiStunden, sonntagStunden, feiertag125, feiertag150,
  };
}

export async function exportBuchhaltungExcel(
  periodLabel: string,
  employees: Employee[],
  shifts: Shift[],
  payrollNotes: PayrollNote[],
  sfnMode: SfnMode = "simple",
  holidayRates?: Map<string, number>,
  commissionMap?: Map<string, number>
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

  const getData = (empId: string, department?: string) => {
    const empShifts = shifts.filter((s) => s.employee_id === empId && (!department || s.department === department));
    const sfn = computeSfn(empShifts, additive, holidayRates);
    return {
      ...sfn,
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const hasCommission = !!commissionMap;
  const sfnHeaders = additive ? ["20-24 Std.", "24-x Std.", "So Std.", "Fei 125%", "Fei 150%"] : ["20-24 Std.", "24-x Std.", "So/Fei Std."];
  function sfnCells(t: ReturnType<typeof getData>): (string | number)[] {
    if (additive) return [t.evening || "", t.night || "", t.sonntagStunden || "", t.feiertag125 || "", t.feiertag150 || ""];
    return [t.evening || "", t.night || "", t.soFeiStunden || ""];
  }

  const wsData: (string | number)[][] = [];
  wsData.push([`Buchhaltung – ${periodLabel}`]);
  wsData.push([]);
  wsData.push(["Mitarbeiter", "Gesamt Std.", "Schichten", ...sfnHeaders, "U (angr.)", "K", ...(hasCommission ? ["Provision"] : []), "Vorschuss", "Besonderheiten"]);

  let lastDept = "";
  for (const emp of sorted) {
    if (emp.department !== lastDept) {
      const row: (string | number)[] = new Array(sfnHeaders.length + 7).fill("");
      row[0] = emp.department;
      wsData.push(row);
      lastDept = emp.department;
    }

    const t = getData(emp.id, emp.department);
    const note = payrollNotes.find((n) => n.employee_id === emp.id);

    const empShifts = shifts.filter((s) => s.employee_id === emp.id && s.department === emp.department);
    const sickRanges = getSickDateRanges(empShifts as any);
    const sickText = sickRanges.length > 0 ? `K: ${formatSickRanges(sickRanges).join(", ")}` : "";
    const vacRanges = getVacationDateRanges(empShifts as any);
    const vacText = vacRanges.length > 0 ? `U: ${formatVacationRanges(vacRanges, empShifts as any).join(", ")}` : "";
    const besText = [note?.besonderheiten, vacText, sickText].filter(Boolean).join(" | ");

    const nicknameAlreadyInName = emp.nickname && (emp.first_name?.includes(emp.nickname) || emp.last_name?.includes(emp.nickname));
    const nameBase = emp.first_name || emp.last_name
      ? [emp.first_name, emp.nickname && !nicknameAlreadyInName ? `(${emp.nickname})` : null, emp.last_name].filter(Boolean).join(" ")
      : emp.name;
    const nameStr = emp.perso_nr && emp.perso_nr > 0 ? `${nameBase} ${emp.perso_nr}` : nameBase;

    const commission = emp.department === "Service" ? (commissionMap?.get(emp.id) ?? 0) : 0;
    wsData.push([nameStr, t.gesamt || "", t.schichten || "", ...sfnCells(t), t.urlaubTage || "", t.krankTage || "", ...(hasCommission ? [commission > 0 ? commission.toFixed(2) : ""] : []), note?.vorschuss || "", besText]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 35 }, { wch: 12 }, { wch: 10 },
    ...sfnHeaders.map(() => ({ wch: 12 })),
    { wch: 10 }, { wch: 6 },
    ...(hasCommission ? [{ wch: 12 }] : []),
    { wch: 12 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Buchhaltung");
  XLSX.writeFile(wb, `Buchhaltung_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
}
