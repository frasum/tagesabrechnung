import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatHours, DEPARTMENT_ORDER, countVacationDays, countSickDays, getSickDateRanges, getVacationDateRanges, formatSickRanges, effectiveEveningHours, effectiveNightHours } from "./shiftCalculations";

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
  start_time: string | null;
  end_time: string | null;
  total_hours: number;
  sunday_holiday_hours: number;
  is_holiday: boolean;
  evening_hours: number;
  night_hours: number;
  absence_type?: string | null;
  shift_date?: string;
  department?: string | null;
}

interface PayrollNote {
  employee_id: string;
  vorschuss: number;
  urlaub_tage: number;
  besonderheiten: string | null;
}

export function exportBuchhaltungPdf(
  periodLabel: string,
  employees: Employee[],
  shifts: Shift[],
  payrollNotes: PayrollNote[]
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

  const getTotals = (empId: string, department?: string) => {
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

  doc.setFontSize(16);
  doc.text(`Buchhaltung – ${periodLabel}`, 14, 15);

  const rows: any[][] = [];
  let lastDept = "";

  for (const emp of sorted) {
    if (emp.department !== lastDept) {
      rows.push([{ content: emp.department, colSpan: 10, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } }]);
      lastDept = emp.department;
    }
    const t = getTotals(emp.id, emp.department);
    const note = payrollNotes.find((n) => n.employee_id === emp.id);

    const empShifts = shifts.filter((s) => s.employee_id === emp.id && s.department === emp.department);
    const sickRanges = getSickDateRanges(empShifts);
    const sickText = sickRanges.length > 0 ? `K: ${formatSickRanges(sickRanges).join(", ")}` : "";
    const vacRanges = getVacationDateRanges(empShifts);
    const vacText = vacRanges.length > 0 ? `U: ${formatSickRanges(vacRanges).join(", ")}` : "";
    const besText = [note?.besonderheiten, vacText, sickText].filter(Boolean).join(" | ");

    const nameParts = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name;
    const metaParts: string[] = [];
    if (emp.nickname) metaParts.push(emp.nickname);
    if (emp.perso_nr && emp.perso_nr > 0) metaParts.push(String(emp.perso_nr));
    const nameStr = metaParts.length > 0 ? `${nameParts} (${metaParts.join(" · ")})` : nameParts;

    rows.push([
      nameStr,
      formatHours(t.gesamt),
      String(t.schichten),
      t.evening > 0 ? formatHours(t.evening) : "",
      t.night > 0 ? formatHours(t.night) : "",
      t.soFeiStunden > 0 ? formatHours(t.soFeiStunden) : "",
      t.urlaubTage > 0 ? t.urlaubTage.toFixed(2).replace('.', ',') : "",
      t.krankTage > 0 ? String(t.krankTage) : "",
      note?.vorschuss ? String(note.vorschuss) : "",
      besText,
    ]);
  }

  autoTable(doc, {
    startY: 20,
    head: [["Mitarbeiter", "Gesamt Std.", "Schichten", "20-24 Std.", "24-x Std.", "So/Fei Std.", "U (angr.)", "K", "Vorschuss", "Besonderheiten"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "center", cellWidth: 16 },
      5: { halign: "center", cellWidth: 16 },
      6: { halign: "center", cellWidth: 14 },
      7: { halign: "center", cellWidth: 10 },
      8: { halign: "center", cellWidth: 16 },
      9: { cellWidth: 84 },
    },
  });

  doc.save(`Buchhaltung_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}
