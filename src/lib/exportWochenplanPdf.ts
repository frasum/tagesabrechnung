import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { formatHours, DEPARTMENT_ORDER, calculateShiftHours, isSunday, countVacationDays, countSickDays } from "./shiftCalculations";

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
  evening_hours: number;
  night_hours: number;
  absence_type: string | null;
  department: string | null;
}

function fmtTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5).replace(/^0/, "");
}

export function exportWochenplanPdf(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  holidays: Map<string, string>
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const sorted = [...employees].sort((a, b) => {
    const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
    const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
    if (aIdx !== bIdx) return aIdx - bIdx;
    const nameA = (a.nickname || a.first_name || "").toLowerCase();
    const nameB = (b.nickname || b.first_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "de");
  });

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);

  sortedWeeks.forEach((week, weekIdx) => {
    if (weekIdx > 0) doc.addPage();

    const days = eachDayOfInterval({ start: parseISO(week.start_date), end: parseISO(week.end_date) });
    const dayStrs = days.map(d => format(d, "yyyy-MM-dd"));

    // Support cumulated mode: match shifts by date range instead of just week_id
    const weekDayStrs = new Set(dayStrs);
    const weekShifts = shifts.filter(s => weekDayStrs.has(s.shift_date));

    const startFmt = format(parseISO(week.start_date), "dd.MM.", { locale: de });
    const endFmt = format(parseISO(week.end_date), "dd.MM.", { locale: de });
    const title = `Wochenplan – ${periodLabel} – Woche ${week.week_number} (${startFmt} – ${endFmt})`;

    doc.setFontSize(12);
    doc.text(title, 14, 12);

    // Build header
    const dayHeaders = days.map(d => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayName = format(d, "EE", { locale: de });
      const dayDate = format(d, "dd.MM.");
      const isHol = holidays.has(dateStr);
      return `${dayName} ${dayDate}${isHol ? " *" : ""}`;
    });

    const head = [["Mitarbeiter", ...dayHeaders, "Ges", "20-24", "24-x", "So/F", "U", "K"]];

    const rows: any[][] = [];
    let lastDept = "";

    for (const emp of sorted) {
      if (emp.department !== lastDept) {
        const colCount = days.length + 7;
        rows.push([{ content: emp.department, colSpan: colCount, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } }]);
        lastDept = emp.department;
      }

      const empShifts = weekShifts.filter(s => s.employee_id === emp.id && s.department === emp.department);
      const totals = {
        gesamt: empShifts.reduce((s, x) => s + Number(x.total_hours), 0),
        soFei: empShifts.reduce((s, x) => s + Number(x.sunday_holiday_hours), 0),
        evening: empShifts.reduce((s, x) => s + Number(x.evening_hours), 0),
        night: empShifts.reduce((s, x) => s + Number(x.night_hours), 0),
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

      rows.push([
        displayName,
        ...dayCells,
        formatHours(totals.gesamt),
        totals.evening > 0 ? formatHours(totals.evening) : "",
        totals.night > 0 ? formatHours(totals.night) : "",
        totals.soFei > 0 ? formatHours(totals.soFei) : "",
        totals.urlaub > 0 ? String(totals.urlaub) : "",
        totals.krank > 0 ? String(totals.krank) : "",
      ]);
    }

    const dayColWidth = Math.min(22, (297 - 14 - 14 - 45 - 6 * 13) / days.length);

    const columnStyles: Record<number, any> = {
      0: { cellWidth: 45 },
    };
    days.forEach((_, i) => {
      columnStyles[i + 1] = { halign: "center", cellWidth: dayColWidth };
    });
    const summaryStart = days.length + 1;
    for (let i = 0; i < 6; i++) {
      columnStyles[summaryStart + i] = { halign: "center", cellWidth: 13 };
    }

    autoTable(doc, {
      startY: 16,
      head,
      body: rows,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [60, 60, 60], fontSize: 6 },
      columnStyles,
      margin: { left: 7, right: 7 },
    });
  });

  doc.save(`Wochenplan_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}
