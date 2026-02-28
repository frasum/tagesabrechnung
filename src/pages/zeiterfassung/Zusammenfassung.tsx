import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatHours, DEPARTMENT_ORDER, getDepartmentBgClass, countVacationDays, countSickDays } from "@/lib/shiftCalculations";
import { useRestaurant, useRestaurants } from "@/contexts/RestaurantContext";
import { useZtContext } from "@/contexts/ZtContext";
import { useCrossRestaurantData } from "@/hooks/useCrossRestaurantData";

export default function Zusammenfassung() {
  const { restaurantId: selectedRestaurantId } = useRestaurant();
  const { selectedPeriodId, setSelectedPeriodId, periods } = useZtContext();
  const { data: restaurants } = useRestaurants();
  const [viewMode, setViewMode] = useState("all");

  const { matchingPeriods, weeks, weekNumberToIds, shifts, employees } = useCrossRestaurantData(selectedPeriodId, selectedRestaurantId ?? "", viewMode);

  useEffect(() => {
    setViewMode("all");
  }, [selectedPeriodId]);

  const sortedEmployees = employees
    ? [...employees].sort((a, b) => {
        const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
        const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
        if (aIdx !== bIdx) return aIdx - bIdx;
        const nameA = (a.nickname || a.first_name).toLowerCase();
        const nameB = (b.nickname || b.first_name).toLowerCase();
        return nameA.localeCompare(nameB, "de");
      })
    : [];

  const employeesWithShifts = sortedEmployees.filter((emp) =>
    shifts?.some((s) => s.employee_id === emp.id && (!emp.department || (s as any).department === emp.department) && (Number(s.total_hours) > 0 || !!s.absence_type))
  );

  const getDepartmentTotals = (department: string) => {
    const deptShifts = shifts?.filter((s) => (s as any).department === department) ?? [];
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

  const getEmployeeTotals = (empId: string, department?: string) => {
    const empShifts = shifts?.filter((s) => s.employee_id === empId && (!department || (s as any).department === department)) ?? [];
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

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    const weekIds = weekNumberToIds[weekNumber] ?? [];
    const weekShifts = shifts?.filter((s) => s.employee_id === empId && weekIds.includes(s.week_id) && (!department || (s as any).department === department)) ?? [];
    return weekShifts.reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  const showRestaurantFilter = matchingPeriods && matchingPeriods.length > 1;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Zusammenfassung</h1>
        {showRestaurantFilter && (
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kumuliert ({matchingPeriods.length} Restaurants)</SelectItem>
              {matchingPeriods.map((p) => {
                const name = restaurants?.find((r) => r.id === p.restaurant_id)?.name ?? p.restaurant_id;
                return <SelectItem key={p.id} value={p.restaurant_id!}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Periode wählen" />
        </SelectTrigger>
        <SelectContent>
          {periods?.map((p: any) => (
            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 font-medium">Mitarbeiter</th>
              {weeks?.map((w) => (
                <th key={w.id} className="text-center p-2 font-medium">W{w.week_number}</th>
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
                <>
                  {showDeptHeader && (
                    <tr key={`dept-${emp.department}`}>
                      <td colSpan={(weeks?.length ?? 0) + 8} className={`p-2 font-bold text-xs uppercase tracking-wide ${getDepartmentBgClass(emp.department)}`}>
                        {emp.department}
                      </td>
                    </tr>
                  )}
                  <tr key={`${emp.id}-${emp.department}`} className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium">
                      <span className="text-xs text-muted-foreground mr-1">{emp.perso_nr}</span>
                      {emp.nickname ? `${emp.nickname} - ` : ""}{emp.first_name} {emp.last_name}
                    </td>
                    {weeks?.map((w) => (
                      <td key={w.id} className="text-center p-2">{formatHours(getWeeklyHours(emp.id, w.week_number, emp.department))}</td>
                    ))}
                    <td className="text-center p-2 font-medium">{formatHours(totals.gesamt)}</td>
                    <td className="text-center p-2">{totals.schichten}</td>
                    <td className="text-center p-2">{totals.soFei > 0 ? formatHours(totals.soFei) : ""}</td>
                    <td className="text-center p-2">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                    <td className="text-center p-2">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
                    <td className="text-center p-2 text-green-600 font-medium">{totals.urlaubTage > 0 ? totals.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
                    <td className="text-center p-2 text-red-600 font-medium">{totals.krankTage > 0 ? totals.krankTage : ""}</td>
                  </tr>
                  {showDeptSubtotal && (() => {
                    const dt = getDepartmentTotals(emp.department!);
                    return (
                      <tr key={`subtotal-${emp.department}`} className={`border-t-2 font-bold ${getDepartmentBgClass(emp.department)}`}>
                        <td className="p-2 text-xs uppercase">Summe {emp.department}</td>
                        {weeks?.map((w) => <td key={w.id} className="text-center p-2"></td>)}
                        <td className="text-center p-2">{formatHours(dt.gesamt)}</td>
                        <td className="text-center p-2">{dt.schichten}</td>
                        <td className="text-center p-2">{dt.soFei > 0 ? formatHours(dt.soFei) : ""}</td>
                        <td className="text-center p-2">{dt.evening > 0 ? formatHours(dt.evening) : ""}</td>
                        <td className="text-center p-2">{dt.night > 0 ? formatHours(dt.night) : ""}</td>
                        <td className="text-center p-2">{dt.urlaubTage > 0 ? dt.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
                        <td className="text-center p-2">{dt.krankTage > 0 ? dt.krankTage : ""}</td>
                      </tr>
                    );
                  })()}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold bg-muted">
              <td className="p-2 uppercase text-xs">Gesamt</td>
              {weeks?.map((w) => <td key={w.id} className="text-center p-2"></td>)}
              <td className="text-center p-2">{formatHours(grandTotals.gesamt)}</td>
              <td className="text-center p-2">{grandTotals.schichten}</td>
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
