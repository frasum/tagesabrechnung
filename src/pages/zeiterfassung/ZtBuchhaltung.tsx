import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useRestaurant, useRestaurants } from "@/contexts/RestaurantContext";
import { useZtContext } from "@/contexts/ZtContext";
import { useCrossRestaurantData } from "@/hooks/useCrossRestaurantData";
import { DEPARTMENT_ORDER } from "@/lib/shiftCalculations";
import { exportBuchhaltungPdf } from "@/lib/exportBuchhaltungPdf";
import { getEmployeeTotals } from "./buchhaltung/utils";
import BuchhaltungHeader from "./buchhaltung/BuchhaltungHeader";
import BuchhaltungDeptHeader from "./buchhaltung/BuchhaltungDeptHeader";
import BuchhaltungRow from "./buchhaltung/BuchhaltungRow";
import BuchhaltungFooter from "./buchhaltung/BuchhaltungFooter";
import BuchhaltungTableHead from "./buchhaltung/BuchhaltungTableHead";

export default function ZtBuchhaltung() {
  const queryClient = useQueryClient();
  const { restaurantId: selectedRestaurantId } = useRestaurant();
  const { selectedPeriodId, setSelectedPeriodId, periods } = useZtContext();
  const { data: restaurants } = useRestaurants();
  const [viewMode, setViewMode] = useState("all");

  const { selectedPeriod, matchingPeriods, effectivePeriodIds, shifts, employees } = useCrossRestaurantData(selectedPeriodId, selectedRestaurantId ?? "", viewMode);

  const { data: payrollNotes } = useQuery({
    queryKey: ["zt-payroll-notes", effectivePeriodIds],
    queryFn: async () => {
      if (!effectivePeriodIds.length) return [];
      const { data, error } = await supabase.from("payroll_notes").select("*").in("period_id", effectivePeriodIds);
      if (error) throw error;
      return data;
    },
    enabled: effectivePeriodIds.length > 0,
  });

  useEffect(() => {
    setViewMode("all");
  }, [selectedPeriodId]);

  const upsertNote = useMutation({
    mutationFn: async (note: { employee_id: string; field: string; value: any }) => {
      const existing = payrollNotes?.find((n) => n.employee_id === note.employee_id);
      if (existing) {
        const { error } = await supabase.from("payroll_notes").update({ [note.field]: note.value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_notes").insert({
          employee_id: note.employee_id,
          period_id: selectedPeriodId,
          [note.field]: note.value,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zt-payroll-notes", effectivePeriodIds] }),
    onError: () => toast.error("Fehler beim Speichern"),
  });

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
    shifts?.some((s) =>
      s.employee_id === emp.id &&
      (!emp.department || (s as any).department === emp.department) &&
      (Number(s.total_hours) > 0 || s.absence_type)
    )
  );

  const grandTotals = useMemo(() => {
    const t = { gesamt: 0, schichten: 0, soFei: 0, evening: 0, night: 0, urlaubTage: 0, krankTage: 0 };
    employeesWithShifts.forEach((emp) => {
      const row = getEmployeeTotals(emp.id, shifts ?? [], emp.department);
      t.gesamt += row.gesamt;
      t.schichten += row.schichten;
      t.soFei += row.soFei;
      t.evening += row.evening;
      t.night += row.night;
      t.urlaubTage += row.urlaubTage;
      t.krankTage += row.krankTage;
    });
    return t;
  }, [employeesWithShifts, shifts]);

  const showRestaurantFilter = matchingPeriods && matchingPeriods.length > 1;

  const handleExportPdf = () => {
    if (!selectedPeriod || !employeesWithShifts.length) {
      toast.error("Keine Daten zum Exportieren");
      return;
    }
    exportBuchhaltungPdf(selectedPeriod.label, employeesWithShifts, shifts ?? [], payrollNotes ?? []);
    toast.success("PDF wurde erstellt");
  };

  let zebraIdx = 0;
  let lastDept: string | null = null;

  return (
    <div className="space-y-4 p-4">
      <BuchhaltungHeader
        selectedPeriodId={selectedPeriodId}
        setSelectedPeriodId={setSelectedPeriodId}
        periods={periods}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showRestaurantFilter={!!showRestaurantFilter}
        matchingPeriods={matchingPeriods ?? []}
        restaurants={restaurants ?? []}
        onExportPdf={handleExportPdf}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <BuchhaltungTableHead />
            <tbody>
              {employeesWithShifts.map((emp) => {
                const showDeptHeader = emp.department !== lastDept;
                if (showDeptHeader) { zebraIdx = 0; lastDept = emp.department; }
                const isEven = zebraIdx % 2 === 1;
                zebraIdx++;

                const totals = getEmployeeTotals(emp.id, shifts ?? [], emp.department);
                const note = payrollNotes?.find((n) => n.employee_id === emp.id);
                const empShifts = shifts?.filter(s => s.employee_id === emp.id && (!emp.department || (s as any).department === emp.department)) ?? [];

                return (
                  <React.Fragment key={`${emp.id}-${emp.department}-${selectedPeriodId}`}>
                    {showDeptHeader && <BuchhaltungDeptHeader department={emp.department} />}
                    <BuchhaltungRow
                      emp={emp}
                      totals={totals}
                      note={note as any}
                      shifts={empShifts}
                      isEven={isEven}
                      onUpsertNote={(params) => upsertNote.mutate(params)}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
            {employeesWithShifts.length > 0 && <BuchhaltungFooter grandTotals={grandTotals} />}
          </table>
        </div>
      </Card>
    </div>
  );
}
