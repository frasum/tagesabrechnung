import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatHours, DEPARTMENT_ORDER, getDepartmentBgClass, countVacationDays, countSickDays } from "@/lib/shiftCalculations";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRestaurantEmployees } from "@/hooks/useRestaurantEmployees";
import { useZt } from "@/contexts/ZtContext";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { exportZusammenfassungPdf } from "@/lib/exportZusammenfassungPdf";
import { exportZusammenfassungExcel } from "@/lib/exportZusammenfassungExcel";

type Shift = {
  id: string;
  employee_id: string;
  week_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number;
  evening_hours: number;
  night_hours: number;
  sunday_holiday_hours: number;
  absence_type: string | null;
  department: string | null;
};

export default function ZtZusammenfassung() {
  const { restaurantId } = useRestaurant();
  const { selectedPeriodId, setSelectedPeriodId, periods, weeks } = useZt();
  const { data: employees } = useRestaurantEmployees(restaurantId);

  // Load all shifts for all weeks of the selected period
  const weekIds = weeks?.map(w => w.id) ?? [];
  const { data: shifts } = useQuery({
    queryKey: ["zt-summary-shifts", weekIds],
    queryFn: async () => {
      if (!weekIds.length) return [];
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("*")
        .in("week_id", weekIds);
      if (error) throw error;
      return data as Shift[];
    },
    enabled: weekIds.length > 0,
  });

  // Build a map: weekNumber -> weekIds (for cross-restaurant compatibility later)
  const weekNumberToIds: Record<number, string[]> = {};
  weeks?.forEach(w => {
    (weekNumberToIds[w.week_number] ??= []).push(w.id);
  });

  const sortedEmployees = employees
    ? [...employees].sort((a, b) => {
        const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
        const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
        if (aIdx !== bIdx) return aIdx - bIdx;
        const nameA = (a.nickname || a.first_name || "").toLowerCase();
        const nameB = (b.nickname || b.first_name || "").toLowerCase();
        return nameA.localeCompare(nameB, "de");
      })
    : [];

  const employeesWithShifts = sortedEmployees.filter((emp) =>
    shifts?.some((s) => s.employee_id === emp.id && s.department === emp.department && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  const getEmployeeTotals = (empId: string, department?: string) => {
    const empShifts = shifts?.filter((s) => s.employee_id === empId && (!department || s.department === department)) ?? [];
    return {
      gesamt: empShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: empShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const getDepartmentTotals = (department: string) => {
    const deptShifts = shifts?.filter((s) => s.department === department) ?? [];
    return {
      gesamt: deptShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: deptShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: deptShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: deptShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: deptShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(deptShifts),
      krankTage: countSickDays(deptShifts),
    };
  };

  const grandTotals = (() => {
    const allShifts = shifts ?? [];
    return {
      gesamt: allShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFei: allShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: allShifts.reduce((sum, s) => sum + Number(s.evening_hours), 0),
      night: allShifts.reduce((sum, s) => sum + Number(s.night_hours), 0),
      schichten: allShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(allShifts),
      krankTage: countSickDays(allShifts),
    };
  })();

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const wIds = weekNumberToIds[weekNumber] ?? [];
    const weekShifts = shifts?.filter((s) => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department)) ?? [];
    return weekShifts.reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Zusammenfassung</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Periode wählen" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          disabled={!employeesWithShifts.length}
          onClick={() => {
            const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
            if (selectedPeriod && weeks && shifts) {
              exportZusammenfassungPdf(selectedPeriod.label, employeesWithShifts, weeks, shifts);
            }
          }}
        >
          <FileDown className="mr-1 h-4 w-4" />
          PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={!employeesWithShifts.length}
          onClick={() => {
            const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
            if (selectedPeriod && weeks && shifts) {
              exportZusammenfassungExcel(selectedPeriod.label, employeesWithShifts, weeks, shifts);
            }
          }}
        >
          <FileSpreadsheet className="mr-1 h-4 w-4" />
          Excel
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 font-medium sticky left-0 bg-muted z-10">Mitarbeiter</th>
              {weeks?.map((w) => (
                <th key={w.id} className="text-center p-2 font-medium whitespace-nowrap">W{w.week_number}</th>
              ))}
              <th className="text-center p-2 font-medium">Gesamt</th>
              <th className="text-center p-2 font-medium">Schichten</th>
              <th className="text-center p-2 font-medium">So/Fei</th>
              <th className="text-center p-2 font-medium">20-24</th>
              <th className="text-center p-2 font-medium">24-x</th>
              <th className="text-center p-2 font-medium">U</th>
              <th className="text-center p-2 font-medium">K</th>
            </tr>
          </thead>
          <tbody>
            {employeesWithShifts.map((emp, idx) => {
              const prevDept = idx > 0 ? employeesWithShifts[idx - 1].department : null;
              const showDeptHeader = emp.department !== prevDept;
              const nextDept = idx < employeesWithShifts.length - 1 ? employeesWithShifts[idx + 1].department : null;
              const showDeptSubtotal = emp.department !== nextDept;
              const totals = getEmployeeTotals(emp.id, emp.department);

              return (
                <React.Fragment key={`${emp.id}-${emp.department}`}>
                  {showDeptHeader && (
                    <tr>
                      <td colSpan={(weeks?.length ?? 0) + 8} className={`p-2 font-bold text-xs uppercase tracking-wide ${getDepartmentBgClass(emp.department)}`}>
                        {emp.department}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium sticky left-0 bg-background z-10">
                      <span className="text-xs text-muted-foreground mr-1">{emp.perso_nr}</span>
                      {emp.nickname ? `${emp.nickname} - ` : ""}{[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name}
                    </td>
                    {weeks?.map((w) => {
                      const h = getWeeklyHours(emp.id, w.week_number, emp.department);
                      return <td key={w.id} className="text-center p-2">{h > 0 ? formatHours(h) : ""}</td>;
                    })}
                    <td className="text-center p-2 font-medium">{formatHours(totals.gesamt)}</td>
                    <td className="text-center p-2">{totals.schichten || ""}</td>
                    <td className="text-center p-2">{totals.soFei > 0 ? formatHours(totals.soFei) : ""}</td>
                    <td className="text-center p-2">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                    <td className="text-center p-2">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
                    <td className="text-center p-2 text-green-600 font-medium">{totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
                    <td className="text-center p-2 text-red-600 font-medium">{totals.krankTage > 0 ? totals.krankTage : ""}</td>
                  </tr>
                  {showDeptSubtotal && (() => {
                    const dt = getDepartmentTotals(emp.department!);
                    return (
                      <tr className={`border-t-2 font-bold ${getDepartmentBgClass(emp.department)}`}>
                        <td className="p-2 text-xs uppercase sticky left-0 z-10">Summe {emp.department}</td>
                        {weeks?.map((w) => <td key={w.id} className="text-center p-2"></td>)}
                        <td className="text-center p-2">{formatHours(dt.gesamt)}</td>
                        <td className="text-center p-2">{dt.schichten || ""}</td>
                        <td className="text-center p-2">{dt.soFei > 0 ? formatHours(dt.soFei) : ""}</td>
                        <td className="text-center p-2">{dt.evening > 0 ? formatHours(dt.evening) : ""}</td>
                        <td className="text-center p-2">{dt.night > 0 ? formatHours(dt.night) : ""}</td>
                        <td className="text-center p-2">{dt.urlaubTage > 0 ? dt.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
                        <td className="text-center p-2">{dt.krankTage > 0 ? dt.krankTage : ""}</td>
                      </tr>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold bg-muted">
              <td className="p-2 uppercase text-xs sticky left-0 bg-muted z-10">Gesamt</td>
              {weeks?.map((w) => <td key={w.id} className="text-center p-2"></td>)}
              <td className="text-center p-2">{formatHours(grandTotals.gesamt)}</td>
              <td className="text-center p-2">{grandTotals.schichten || ""}</td>
              <td className="text-center p-2">{grandTotals.soFei > 0 ? formatHours(grandTotals.soFei) : ""}</td>
              <td className="text-center p-2">{grandTotals.evening > 0 ? formatHours(grandTotals.evening) : ""}</td>
              <td className="text-center p-2">{grandTotals.night > 0 ? formatHours(grandTotals.night) : ""}</td>
              <td className="text-center p-2">{grandTotals.urlaubTage > 0 ? grandTotals.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
              <td className="text-center p-2">{grandTotals.krankTage > 0 ? grandTotals.krankTage : ""}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
