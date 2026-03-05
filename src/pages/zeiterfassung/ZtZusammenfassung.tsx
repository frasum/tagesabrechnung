import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import SfnTooltipHeader from "@/components/zeiterfassung/SfnTooltipHeader";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZtToolbar } from "@/components/zeiterfassung/ZtToolbar";
import { formatHours, DEPARTMENT_ORDER, getDepartmentBgClass, countVacationDays, countSickDays, effectiveEveningHours, effectiveNightHours } from "@/lib/shiftCalculations";
import { useRestaurant, useRestaurants } from "@/hooks/useRestaurant";
import { useRestaurantEmployees } from "@/hooks/useRestaurantEmployees";
import { useZt } from "@/contexts/ZtContext";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { exportZusammenfassungPdf } from "@/lib/exportZusammenfassungPdf";
import { exportZusammenfassungExcel } from "@/lib/exportZusammenfassungExcel";
import { useCumulatedZtData } from "@/hooks/useCumulatedZtData";
import { useAuth } from "@/contexts/AuthContext";
import { useHolidayRates } from "@/hooks/useHolidayRates";
import ShiftTimeOverride from "@/components/zeiterfassung/ShiftTimeOverride";

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
  is_holiday: boolean;
  absence_type: string | null;
  department: string | null;
};

export default function ZtZusammenfassung() {
  const { restaurantId, restaurantSlug } = useRestaurant();
  const { data: allRestaurants } = useRestaurants();
  const allRestaurantIds = allRestaurants?.map(r => r.id) ?? [];
  const { selectedPeriodId, setSelectedPeriodId, periods, weeks: contextWeeks } = useZt();
  const { data: restaurantEmployees } = useRestaurantEmployees(restaurantId);
  const [cumulated, setCumulated] = useState(false);
  const { hasPermission } = useAuth();
  const { data: holidayRates } = useHolidayRates();
  const outletContext = useOutletContext<{ sfnMode?: string }>();
  const sfnMode = (outletContext?.sfnMode as "simple" | "extended") ?? "simple";
  const isExtended = sfnMode === "extended";

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
  const cumData = useCumulatedZtData(cumulated, selectedPeriod);

  // Load employees from ALL restaurants for ShiftTimeOverride
  const { data: allRestaurantEmployees } = useQuery({
    queryKey: ["all-restaurant-employees-zt", allRestaurantIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_department, staff_id, restaurant_id, staff!inner(id, name, perso_nr, first_name, last_name, nickname)")
        .in("restaurant_id", allRestaurantIds)
        .not("zt_department", "is", null);
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.staff.id,
        name: row.staff.name,
        perso_nr: row.staff.perso_nr,
        first_name: row.staff.first_name,
        last_name: row.staff.last_name,
        nickname: row.staff.nickname,
        department: row.zt_department,
      }));
    },
    enabled: allRestaurantIds.length > 0,
  });

  // Load all week IDs across ALL restaurants for the same period date range
  const { data: allRestaurantWeeks } = useQuery({
    queryKey: ["all-restaurant-weeks-zt", selectedPeriod?.start_date, selectedPeriod?.end_date],
    queryFn: async () => {
      // Find all periods across all restaurants with the same date range
      const { data: matchingPeriods, error: pErr } = await supabase
        .from("scheduling_periods")
        .select("id")
        .eq("start_date", selectedPeriod!.start_date)
        .eq("end_date", selectedPeriod!.end_date);
      if (pErr) throw pErr;
      const periodIds = matchingPeriods.map(p => p.id);
      if (!periodIds.length) return [];
      const { data, error } = await supabase
        .from("weeks")
        .select("*")
        .in("period_id", periodIds);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPeriod,
  });

  const employees = cumulated ? cumData.employees : restaurantEmployees;
  const weeks = cumulated ? cumData.weeks : contextWeeks;

  // Load all shifts for all weeks of the selected period
  const weekIds = cumulated
    ? (cumData.allWeekIds ?? [])
    : (contextWeeks?.map(w => w.id) ?? []);

  const { data: singleShifts } = useQuery({
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
    enabled: !cumulated && weekIds.length > 0,
  });

  const shifts = cumulated ? (cumData.shifts as Shift[] | undefined) : singleShifts;

  // Build a map: weekNumber -> weekIds
  const weekNumberToIds: Record<number, string[]> = cumulated
    ? cumData.weekNumberToAllIds
    : (() => {
        const map: Record<number, string[]> = {};
        weeks?.forEach(w => { (map[w.week_number] ??= []).push(w.id); });
        return map;
      })();

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
      soFeiStunden: empShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      sonntagStunden: empShifts.filter(s => !s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      feiertagStunden: empShifts.filter(s => s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: empShifts.reduce((sum, s) => sum + effectiveEveningHours(s, isExtended), 0),
      night: empShifts.reduce((sum, s) => sum + effectiveNightHours(s, isExtended), 0),
      schichten: empShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(empShifts),
      krankTage: countSickDays(empShifts),
    };
  };

  const getDepartmentTotals = (department: string) => {
    const deptShifts = shifts?.filter((s) => s.department === department) ?? [];
    return {
      gesamt: deptShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: deptShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      sonntagStunden: deptShifts.filter(s => !s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      feiertagStunden: deptShifts.filter(s => s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: deptShifts.reduce((sum, s) => sum + effectiveEveningHours(s, isExtended), 0),
      night: deptShifts.reduce((sum, s) => sum + effectiveNightHours(s, isExtended), 0),
      schichten: deptShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(deptShifts),
      krankTage: countSickDays(deptShifts),
    };
  };

  const grandTotals = (() => {
    const allShifts = shifts ?? [];
    return {
      gesamt: allShifts.reduce((sum, s) => sum + Number(s.total_hours), 0),
      soFeiStunden: allShifts.reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      sonntagStunden: allShifts.filter(s => !s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      feiertagStunden: allShifts.filter(s => s.is_holiday).reduce((sum, s) => sum + Number(s.sunday_holiday_hours), 0),
      evening: allShifts.reduce((sum, s) => sum + effectiveEveningHours(s, isExtended), 0),
      night: allShifts.reduce((sum, s) => sum + effectiveNightHours(s, isExtended), 0),
      schichten: allShifts.filter(s => s.start_time && s.end_time && !s.absence_type).length,
      urlaubTage: countVacationDays(allShifts),
      krankTage: countSickDays(allShifts),
    };
  })();

  const getWeeklyHours = (empId: string, weekNumber: number, department?: string) => {
    // In cumulated mode, shifts are loaded for ALL weeks across restaurants
    // We filter by week_number via the weekNumberToIds mapping
    const wIds = weekNumberToIds[weekNumber] ?? [];
    // But in cumulated mode, multiple weeks with same week_number exist across periods
    // The shifts are loaded with ALL week IDs, so we need to find all shifts matching any of those week IDs
    const weekShifts = shifts?.filter((s) => s.employee_id === empId && wIds.includes(s.week_id) && (!department || s.department === department)) ?? [];
    return weekShifts.reduce((sum, s) => sum + Number(s.total_hours), 0);
  };

  return (
    <div className="space-y-4">
      <ZtToolbar
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={setSelectedPeriodId}
        showCumulated={(allRestaurants?.length ?? 0) > 1}
        cumulated={cumulated}
        onCumulatedToggle={() => setCumulated(c => !c)}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!employeesWithShifts.length} onClick={() => { if (selectedPeriod && weeks && shifts) { exportZusammenfassungPdf(selectedPeriod.label + (cumulated ? " (Alle Restaurants)" : ""), employeesWithShifts, weeks, shifts, cumulated ? cumData.weekNumberToAllIds : undefined, sfnMode, holidayRates); } }}>
              <FileDown className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" disabled={!employeesWithShifts.length} onClick={() => { if (selectedPeriod && weeks && shifts) { exportZusammenfassungExcel(selectedPeriod.label + (cumulated ? " (Alle Restaurants)" : ""), employeesWithShifts, weeks, shifts, cumulated ? cumData.weekNumberToAllIds : undefined, sfnMode, holidayRates); } }}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 font-medium sticky left-0 bg-muted z-10">Mitarbeiter</th>
              {weeks?.map((w) => (
                <th key={w.id} className="text-center p-2 font-medium whitespace-nowrap">W{w.week_number} {format(parseISO(w.start_date), "dd.MM.")}–{format(parseISO(w.end_date), "dd.MM.")}</th>
              ))}
              <th className="text-center p-2 font-medium">Gesamt</th>
              <th className="text-center p-2 font-medium">Schichten</th>
               <th className="text-center p-2 font-medium"><SfnTooltipHeader column="evening" label="20-24" /></th>
               <th className="text-center p-2 font-medium"><SfnTooltipHeader column="night" label="24-x" /></th>
               {isExtended ? (
                 <>
                   <th className="text-center p-2 font-medium"><SfnTooltipHeader column="sonntag" label="So" /></th>
                   <th className="text-center p-2 font-medium"><SfnTooltipHeader column="feiertag" label="Fei" /></th>
                 </>
               ) : (
                 <th className="text-center p-2 font-medium"><SfnTooltipHeader column="soFei" label="So/Fei" /></th>
               )}
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
                      <td colSpan={(weeks?.length ?? 0) + (isExtended ? 9 : 8)} className={`p-2 font-bold text-xs uppercase tracking-wide ${getDepartmentBgClass(emp.department)}`}>
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
                     <td className="text-center p-2">{totals.evening > 0 ? formatHours(totals.evening) : ""}</td>
                     <td className="text-center p-2">{totals.night > 0 ? formatHours(totals.night) : ""}</td>
                     {isExtended ? (
                       <>
                         <td className="text-center p-2">{totals.sonntagStunden > 0 ? formatHours(totals.sonntagStunden) : ""}</td>
                         <td className="text-center p-2">{totals.feiertagStunden > 0 ? formatHours(totals.feiertagStunden) : ""}</td>
                       </>
                     ) : (
                       <td className="text-center p-2">{totals.soFeiStunden > 0 ? formatHours(totals.soFeiStunden) : ""}</td>
                     )}
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
                         <td className="text-center p-2">{dt.evening > 0 ? formatHours(dt.evening) : ""}</td>
                         <td className="text-center p-2">{dt.night > 0 ? formatHours(dt.night) : ""}</td>
                          {isExtended ? (
                            <>
                              <td className="text-center p-2">{dt.sonntagStunden > 0 ? formatHours(dt.sonntagStunden) : ""}</td>
                              <td className="text-center p-2">{dt.feiertagStunden > 0 ? formatHours(dt.feiertagStunden) : ""}</td>
                            </>
                          ) : (
                            <td className="text-center p-2">{dt.soFeiStunden > 0 ? formatHours(dt.soFeiStunden) : ""}</td>
                          )}
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
               <td className="text-center p-2">{grandTotals.evening > 0 ? formatHours(grandTotals.evening) : ""}</td>
               <td className="text-center p-2">{grandTotals.night > 0 ? formatHours(grandTotals.night) : ""}</td>
               {isExtended ? (
                 <>
                   <td className="text-center p-2">{grandTotals.sonntagStunden > 0 ? formatHours(grandTotals.sonntagStunden) : ""}</td>
                   <td className="text-center p-2">{grandTotals.feiertagStunden > 0 ? formatHours(grandTotals.feiertagStunden) : ""}</td>
                 </>
               ) : (
                 <td className="text-center p-2">{grandTotals.soFeiStunden > 0 ? formatHours(grandTotals.soFeiStunden) : ""}</td>
               )}
              <td className="text-center p-2">{grandTotals.urlaubTage > 0 ? grandTotals.urlaubTage.toFixed(2).replace('.', ',') : ""}</td>
              <td className="text-center p-2">{grandTotals.krankTage > 0 ? grandTotals.krankTage : ""}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {hasPermission('admin') && selectedPeriod && (() => {
        const allEmpsSorted = allRestaurantEmployees
          ? [...allRestaurantEmployees].sort((a, b) => {
              const aIdx = DEPARTMENT_ORDER.indexOf(a.department as any);
              const bIdx = DEPARTMENT_ORDER.indexOf(b.department as any);
              if (aIdx !== bIdx) return aIdx - bIdx;
              const nameA = (a.nickname || a.first_name || "").toLowerCase();
              const nameB = (b.nickname || b.first_name || "").toLowerCase();
              return nameA.localeCompare(nameB, "de");
            })
          : [];
        const allWeekIds = allRestaurantWeeks?.map(w => w.id) ?? [];
        const allWeeksForOverride = allRestaurantWeeks ?? [];
        return (
          <ShiftTimeOverride
            employeesWithShifts={allEmpsSorted}
            allEmployees={allEmpsSorted.filter(e => [e.name, e.first_name, e.nickname].some(n => n?.toLowerCase().includes("peter")))}
            dailyEmployees={allEmpsSorted.filter(e =>
              [e.name, e.last_name].some(n => n?.toLowerCase().includes("schumann")) ||
              e.nickname?.toLowerCase().includes("chefin")
            )}
            weekIds={allWeekIds}
            weeks={allWeeksForOverride}
            periodStartDate={selectedPeriod.start_date}
            periodEndDate={selectedPeriod.end_date}
          />
        );
      })()}
    </div>
  );
}
