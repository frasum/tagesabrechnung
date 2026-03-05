import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ZtToolbar } from "@/components/zeiterfassung/ZtToolbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRestaurantEmployees } from "@/hooks/useRestaurantEmployees";
import { useZt } from "@/contexts/ZtContext";
import { DEPARTMENT_ORDER } from "@/lib/shiftCalculations";
import { getEmployeeTotals } from "./buchhaltung/utils";
import { exportBuchhaltungPdf } from "@/lib/exportBuchhaltungPdf";
import { exportBuchhaltungExcel } from "@/lib/exportBuchhaltungExcel";
import BuchhaltungTableHead from "./buchhaltung/BuchhaltungTableHead";
import BuchhaltungDeptHeader from "./buchhaltung/BuchhaltungDeptHeader";
import BuchhaltungRow from "./buchhaltung/BuchhaltungRow";
import BuchhaltungFooter from "./buchhaltung/BuchhaltungFooter";
import { useCumulatedZtData } from "@/hooks/useCumulatedZtData";
import { useHolidayRates } from "@/hooks/useHolidayRates";
import type { Shift, PayrollNote, AdvanceEntry } from "./buchhaltung/types";

export default function ZtBuchhaltung() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurant();
  const { selectedPeriodId, setSelectedPeriodId, periods, weeks, isPeriodLocked } = useZt();
  const { data: restaurantEmployees } = useRestaurantEmployees(restaurantId);
  const [cumulated, setCumulated] = useState(false);
  const outletContext = useOutletContext<{ sfnMode?: string }>();
  const sfnMode = (outletContext?.sfnMode as "simple" | "extended") ?? "simple";
  const isExtended = sfnMode === "extended";
  const { data: holidayRates } = useHolidayRates();
  const { hasPermission } = useAuth();
  const showSfn = hasPermission('admin');

  const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);
  const cumData = useCumulatedZtData(cumulated, selectedPeriod);

  const employees = cumulated ? cumData.employees : restaurantEmployees;
  const weekIds = cumulated
    ? (cumData.allWeekIds ?? [])
    : (weeks?.map(w => w.id) ?? []);

  const { data: singleShifts } = useQuery({
    queryKey: ["zt-buchhaltung-shifts", weekIds],
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

  const { data: singlePayrollNotes } = useQuery({
    queryKey: ["payroll-notes", selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return [];
      const { data, error } = await supabase
        .from("payroll_notes")
        .select("*")
        .eq("period_id", selectedPeriodId);
      if (error) throw error;
      return data as PayrollNote[];
    },
    enabled: !cumulated && !!selectedPeriodId,
  });

  const payrollNotes = cumulated ? (cumData.payrollNotes as PayrollNote[] | undefined) : singlePayrollNotes;

  const { data: singleAdvances } = useQuery({
    queryKey: ["buchhaltung-advances", restaurantId, selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriod || !restaurantId) return [];
      const { data, error } = await supabase
        .from("advances")
        .select("*, sessions!inner(session_date)")
        .eq("sessions.restaurant_id", restaurantId)
        .gte("sessions.session_date", selectedPeriod.start_date)
        .lte("sessions.session_date", selectedPeriod.end_date);
      if (error) throw error;
      return (data as any[]).map(d => ({
        staff_name: d.staff_name as string,
        amount: d.amount as number,
        date: d.sessions.session_date as string,
      })) as AdvanceEntry[];
    },
    enabled: !cumulated && !!selectedPeriod && !!restaurantId,
  });

  const advances = cumulated ? (cumData.advances as AdvanceEntry[] | undefined) : singleAdvances;

  const advancesByName = useMemo(() => {
    const map: Record<string, AdvanceEntry[]> = {};
    advances?.forEach(a => {
      (map[a.staff_name] ??= []).push(a);
    });
    return map;
  }, [advances]);

  const upsertNote = useMutation({
    mutationFn: async (note: { employee_id: string; field: string; value: any }) => {
      const existing = payrollNotes?.find((n) => n.employee_id === note.employee_id);
      if (existing) {
        const { error } = await supabase
          .from("payroll_notes")
          .update({ [note.field]: note.value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payroll_notes")
          .insert({
            employee_id: note.employee_id,
            period_id: selectedPeriodId,
            [note.field]: note.value,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-notes", selectedPeriodId] });
      if (cumulated) {
        queryClient.invalidateQueries({ queryKey: ["cumulated-payroll-notes"] });
      }
    },
    onError: () => toast.error("Fehler beim Speichern"),
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
    shifts?.some((s) =>
      s.employee_id === emp.id &&
      s.department === emp.department &&
      (Number(s.total_hours) > 0 || s.absence_type)
    )
  );

  const grandTotals = useMemo(() => {
    const t = { gesamt: 0, schichten: 0, soFeiStunden: 0, sonntagStunden: 0, feiertagStunden: 0, evening: 0, night: 0, urlaubTage: 0, krankTage: 0 };
    employeesWithShifts.forEach((emp) => {
      const row = getEmployeeTotals(emp.id, shifts ?? [], emp.department, isExtended);
      t.gesamt += row.gesamt;
      t.schichten += row.schichten;
      t.soFeiStunden += row.soFeiStunden;
      t.sonntagStunden += row.sonntagStunden;
      t.feiertagStunden += row.feiertagStunden;
      t.evening += row.evening;
      t.night += row.night;
      t.urlaubTage += row.urlaubTage;
      t.krankTage += row.krankTage;
    });
    return t;
  }, [employeesWithShifts, shifts]);

  let zebraIdx = 0;
  let lastDept: string | null = null;

  return (
    <div className="space-y-4">
      <ZtToolbar
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={setSelectedPeriodId}
        showCumulated
        cumulated={cumulated}
        onCumulatedToggle={() => setCumulated(c => !c)}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!selectedPeriodId || !employeesWithShifts.length} onClick={() => { if (!selectedPeriod) return; exportBuchhaltungPdf(selectedPeriod.label + (cumulated ? " (Kumuliert)" : ""), employeesWithShifts, shifts ?? [], payrollNotes ?? [], sfnMode, holidayRates); toast.success("PDF wurde erstellt"); }}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedPeriodId || !employeesWithShifts.length} onClick={() => { if (!selectedPeriod) return; exportBuchhaltungExcel(selectedPeriod.label + (cumulated ? " (Kumuliert)" : ""), employeesWithShifts, shifts ?? [], payrollNotes ?? [], sfnMode, holidayRates); toast.success("Excel wurde erstellt"); }}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <BuchhaltungTableHead sfnMode={sfnMode} showSfn={showSfn} />
            <tbody>
              {employeesWithShifts.map((emp) => {
                const showDeptHeader = emp.department !== lastDept;
                if (showDeptHeader) { zebraIdx = 0; lastDept = emp.department; }
                const isEven = zebraIdx % 2 === 1;
                zebraIdx++;

                const totals = getEmployeeTotals(emp.id, shifts ?? [], emp.department, isExtended);
                const note = payrollNotes?.find((n) => n.employee_id === emp.id);
                const empShifts = shifts?.filter(s => s.employee_id === emp.id && s.department === emp.department) ?? [];

                return (
                  <React.Fragment key={`${emp.id}-${emp.department}-${selectedPeriodId}`}>
                    {showDeptHeader && <BuchhaltungDeptHeader department={emp.department} sfnMode={sfnMode} showSfn={showSfn} />}
                    <BuchhaltungRow
                      emp={emp}
                      totals={totals}
                      note={note as PayrollNote | undefined}
                      shifts={empShifts}
                      advances={advancesByName[emp.name] ?? []}
                      isEven={isEven}
                      isLocked={isPeriodLocked}
                      sfnMode={sfnMode}
                      showSfn={showSfn}
                      onUpsertNote={(params) => upsertNote.mutate(params)}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
            {employeesWithShifts.length > 0 && <BuchhaltungFooter grandTotals={grandTotals} sfnMode={sfnMode} showSfn={showSfn} />}
          </table>
        </div>
      </Card>
    </div>
  );
}
