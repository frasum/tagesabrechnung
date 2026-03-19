import type * as XLSXType from "xlsx";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { formatHours, DEPARTMENT_ORDER, countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours, isSunday } from "./shiftCalculations";

interface Employee {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  department: string;
}

interface Week {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
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

function fmtTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5).replace(/^0/, "");
}

export async function exportWochenplanExcel(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  holidays: Map<string, string>,
  sfnMode: "simple" | "extended" = "simple",
  holidayRates?: Map<string, number>
) {
  const XLSX: typeof XLSXType = await import("xlsx") as any;
  const isExtended = sfnMode === "extended";
  const wb = XLSX.utils.book_new();

  const sorted = [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  for (const week of sortedWeeks) {
    const days = eachDayOfInterval({ start: parseISO(week.start_date), end: parseISO(week.end_date) });
    const dayStrs = days.map(d => format(d, "yyyy-MM-dd"));
    const weekDayStrs = new Set(dayStrs);
    const weekShifts = shifts.filter(s => weekDayStrs.has(s.shift_date));

    const startFmt = format(parseISO(week.start_date), "dd.MM.", { locale: de });
    const endFmt = format(parseISO(week.end_date), "dd.MM.", { locale: de });

    const wsData: (string | number)[][] = [];

    wsData.push([`Wochenplan – ${periodLabel} – Woche ${week.week_number} (${startFmt} – ${endFmt})`]);
    wsData.push([]);

    const dayHeaders = days.map(d => {
      const dayName = format(d, "EE", { locale: de });
      const dayDate = format(d, "dd.MM.");
      return `${dayName} ${dayDate}`;
    });

    const sfnHeaders = isExtended
      ? ["Ges", "20-24", "24-x", "So", "Fei 125%", "Fei 150%", "U", "K"]
      : ["Ges", "20-24", "24-x", "So/Fei", "U", "K"];

    wsData.push(["Mitarbeiter", ...dayHeaders, ...sfnHeaders]);

    let lastDept = "";
    for (const emp of sorted) {
      if (emp.department !== lastDept) {
        const emptyRow = new Array(days.length + sfnHeaders.length).fill("");
        emptyRow[0] = emp.department;
        wsData.push(emptyRow);
        lastDept = emp.department;
      }

      const empShifts = weekShifts.filter(s => s.employee_id === emp.id && s.department === emp.department);

      let sonntagStunden = 0;
      let feiertag125 = 0;
      let feiertag150 = 0;
      let soFeiStunden = 0;

      if (isExtended) {
        for (const s of empShifts) {
          const hrs = Number(s.sunday_holiday_hours);
          if (hrs <= 0) continue;
          const dateStr = s.shift_date;
          const isHol = holidays.has(dateStr);
          const isSun = isSunday(parseISO(dateStr));

          if (isHol) {
            const rate = holidayRates?.get(dateStr) ?? 1.25;
            if (rate >= 1.50) feiertag150 += hrs;
            else feiertag125 += hrs;
          }
          if (isSun && !isHol) {
            sonntagStunden += hrs;
          }
        }
      } else {
        soFeiStunden = empShifts.reduce((s, x) => s + Number(x.sunday_holiday_hours), 0);
      }

      const totals = {
        gesamt: empShifts.reduce((s, x) => s + Number(x.total_hours), 0),
        evening: empShifts.reduce((s, x) => s + effectiveEveningHours(x), 0),
        night: empShifts.reduce((s, x) => s + effectiveNightHours(x), 0),
        urlaub: countVacationDays(empShifts),
        krank: countSickDays(empShifts),
      };

      const dayCells = dayStrs.map(dateStr => {
        const shift = empShifts.find(s => s.shift_date === dateStr);
        if (!shift) return "—";
        if (shift.absence_type === "urlaub") return "U";
        if (shift.absence_type === "krank") return "K";
        if (!shift.start_time && !shift.end_time) return "—";
        return `${fmtTime(shift.start_time)}-${fmtTime(shift.end_time)}`;
      });

      const displayName = emp.nickname || emp.first_name || emp.name;

      const sfnCells = isExtended
        ? [totals.gesamt, totals.evening, totals.night, sonntagStunden, feiertag125, feiertag150, totals.urlaub, totals.krank]
        : [totals.gesamt, totals.evening, totals.night, soFeiStunden, totals.urlaub, totals.krank];

      wsData.push([displayName, ...dayCells, ...sfnCells]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const sfnColCount = sfnHeaders.length;
    ws["!cols"] = [
      { wch: 18 },
      ...days.map(() => ({ wch: 12 })),
      ...Array(sfnColCount).fill(null).map(() => ({ wch: 8 })),
    ];

    XLSX.utils.book_append_sheet(wb, ws, `W${week.week_number}`);
  }

  XLSX.writeFile(wb, `Wochenplan_${periodLabel.replace(/\s+/g, "_")}.xlsx`);
}
