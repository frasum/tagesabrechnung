import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatHours, DEPARTMENT_ORDER, countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";

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

function getDeptColor(dept: string): [number, number, number] {
  switch (dept) {
    case "Küche": return [255, 243, 224];
    case "GL": return [224, 242, 254];
    case "Service": return [232, 245, 233];
    default: return [230, 230, 230];
  }
}

export function exportZusammenfassungPdf(
  periodLabel: string,
  employees: Employee[],
  weeks: Week[],
  shifts: Shift[],
  externalWeekNumberToIds?: Record<number, string[]>
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

  const weekNumberToIds: Record<number, string[]> = externalWeekNumberToIds ?? (() => {
    const map: Record<number, string[]> = {};
    weeks.forEach(w => { (map[w.week_number] ??= []).push(w.id); });
    return map;
  })();

  const employeesWithShifts = sorted.filter((emp) =>
    shifts.some((s) => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  const getEmpTotals = (empId: string, department?: string) => {
    const empShifts = shifts.filter((s) => s.employee_id === empId && (!department || s.department === department));
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
      night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weekNumberToIds[weekNumber] ?? [];
    return shifts
      .filter((s) => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department))
      .reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  const getDeptTotals = (department: string) => {
    const deptShifts = shifts.filter((s) => s.department === department);
    return {
      gesamt: deptShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: deptShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: deptShifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
      night: deptShifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
      schichten: deptShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(deptShifts),
      krankTage: countSickDays(deptShifts),
    };
  };

  doc.setFontSize(12);
  doc.text(`Zusammenfassung – ${periodLabel}`, 14, 12);

  const head = [["Mitarbeiter", ...sortedWeeks.map(w => `W${w.week_number}`), "Gesamt", "Schichten", "20-24", "24-x", "So/Fei", "U", "K"]];
  const colCount = sortedWeeks.length + 8;

  const rows: any[][] = [];
  let lastDept = "";

  for (const emp of employeesWithShifts) {
    if (emp.department !== lastDept) {
      rows.push([{ content: emp.department, colSpan: colCount, styles: { fontStyle: "bold", fillColor: getDeptColor(emp.department) } }]);
      lastDept = emp.department;
    }

    const totals = getEmpTotals(emp.id, emp.department);
    const displayName = `${emp.perso_nr ? emp.perso_nr + " " : ""}${emp.nickname ? emp.nickname + " - " : ""}${[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name}`;

    const weekCells = sortedWeeks.map(w => {
      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
      return h > 0 ? formatHours(h) : "";
    });

    rows.push([
      displayName,
      ...weekCells,
      formatHours(totals.gesamt),
      totals.schichten || "",
      totals.evening > 0 ? formatHours(totals.evening) : "",
      totals.night > 0 ? formatHours(totals.night) : "",
      totals.soFeiStunden > 0 ? formatHours(totals.soFeiStunden) : "",
      totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace(".", ",") : "",
      totals.krankTage > 0 ? String(totals.krankTage) : "",
    ]);

    const idx = employeesWithShifts.indexOf(emp);
    const nextDept = idx < employeesWithShifts.length - 1 ? employeesWithShifts[idx + 1].department : null;
    if (emp.department !== nextDept) {
      const dt = getDeptTotals(emp.department);
      rows.push([
        { content: `Summe ${emp.department}`, styles: { fontStyle: "bold", fillColor: getDeptColor(emp.department) } },
        ...sortedWeeks.map(() => ""),
        { content: formatHours(dt.gesamt), styles: { fontStyle: "bold" } },
        { content: dt.schichten || "", styles: { fontStyle: "bold" } },
        dt.evening > 0 ? formatHours(dt.evening) : "",
        dt.night > 0 ? formatHours(dt.night) : "",
        dt.soFeiStunden > 0 ? formatHours(dt.soFeiStunden) : "",
        dt.urlaubTage > 0 ? dt.urlaubTage.toFixed(2).replace(".", ",") : "",
        dt.krankTage > 0 ? String(dt.krankTage) : "",
      ]);
    }
  }

  // Grand total
  const allShifts = shifts;
  const grand = {
    gesamt: allShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
    soFeiStunden: allShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
    evening: allShifts.reduce((sum, s) => sum + effectiveEveningHours(s), 0),
    night: allShifts.reduce((sum, s) => sum + effectiveNightHours(s), 0),
    schichten: allShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
    urlaubTage: countVacationDays(allShifts),
    krankTage: countSickDays(allShifts),
  };

  rows.push([
    { content: "GESAMT", styles: { fontStyle: "bold", fillColor: [200, 200, 200] } },
    ...sortedWeeks.map(() => ({ content: "", styles: { fillColor: [200, 200, 200] } })),
    { content: formatHours(grand.gesamt), styles: { fontStyle: "bold", fillColor: [200, 200, 200] } },
    { content: grand.schichten || "", styles: { fontStyle: "bold", fillColor: [200, 200, 200] } },
    { content: grand.evening > 0 ? formatHours(grand.evening) : "", styles: { fillColor: [200, 200, 200] } },
    { content: grand.night > 0 ? formatHours(grand.night) : "", styles: { fillColor: [200, 200, 200] } },
    { content: grand.soFeiStunden > 0 ? formatHours(grand.soFeiStunden) : "", styles: { fillColor: [200, 200, 200] } },
    { content: grand.urlaubTage > 0 ? grand.urlaubTage.toFixed(2).replace(".", ",") : "", styles: { fillColor: [200, 200, 200] } },
    { content: grand.krankTage > 0 ? String(grand.krankTage) : "", styles: { fillColor: [200, 200, 200] } },
  ]);

  const weekColWidth = Math.min(16, (297 - 14 - 14 - 45 - 7 * 13) / sortedWeeks.length);
  const columnStyles: Record<number, any> = { 0: { cellWidth: 45 } };
  sortedWeeks.forEach((_, i) => {
    columnStyles[i + 1] = { halign: "center", cellWidth: weekColWidth };
  });
  const summaryStart = sortedWeeks.length + 1;
  for (let i = 0; i < 7; i++) {
    columnStyles[summaryStart + i] = { halign: "center", cellWidth: 12 };
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

  doc.save(`Zusammenfassung_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}
