import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, Loader2 } from "lucide-react";
import { calculateShiftHours } from "@/lib/shiftCalculations";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  department?: string | null;
}

interface ShiftTimeOverrideProps {
  employeesWithShifts: Employee[];
  weekIds: string[];
  periodStartDate?: string;
  periodEndDate?: string;
}

export default function ShiftTimeOverride({
  employeesWithShifts,
  weekIds,
  periodStartDate,
  periodEndDate,
}: ShiftTimeOverrideProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Deduplicate employees by id (they may appear multiple times for different departments)
  const uniqueEmployees = React.useMemo(() => {
    const map = new Map<string, Employee>();
    employeesWithShifts.forEach((e) => {
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [employeesWithShifts]);

  // Load holidays for the period range
  const { data: holidays } = useQuery({
    queryKey: ["bavarian-holidays", periodStartDate, periodEndDate],
    queryFn: async () => {
      if (!periodStartDate || !periodEndDate) return [];
      const { data, error } = await supabase
        .from("bavarian_holidays")
        .select("holiday_date")
        .gte("holiday_date", periodStartDate)
        .lte("holiday_date", periodEndDate);
      if (error) throw error;
      return data.map((h) => h.holiday_date);
    },
    enabled: !!periodStartDate && !!periodEndDate,
  });

  const holidaySet = React.useMemo(() => new Set(holidays ?? []), [holidays]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === uniqueEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uniqueEmployees.map((e) => e.id)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;

    setIsUpdating(true);
    try {
      // Load all shifts for selected employees in the period
      const { data: shifts, error } = await supabase
        .from("zt_shifts")
        .select("*")
        .in("week_id", weekIds)
        .in("employee_id", Array.from(selectedIds));

      if (error) throw error;

      // Filter to only shifts that have start/end times and no absence
      const editableShifts = (shifts ?? []).filter(
        (s) => s.start_time && s.end_time && !s.absence_type
      );

      if (editableShifts.length === 0) {
        toast({ title: "Keine anpassbaren Schichten gefunden." });
        setIsUpdating(false);
        return;
      }

      let updated = 0;
      for (const shift of editableShifts) {
        const date = shift.shift_date;
        const dayOfWeek = new Date(date + "T12:00:00").getDay(); // avoid timezone issues
        const isSundayOrHoliday = dayOfWeek === 0 || holidaySet.has(date);

        const newStart = isSundayOrHoliday ? "15:00" : "17:00";
        const newEnd = isSundayOrHoliday ? "02:00" : "01:00";

        const hours = calculateShiftHours(newStart, newEnd, isSundayOrHoliday);

        const { error: updateError } = await supabase
          .from("zt_shifts")
          .update({
            start_time: newStart,
            end_time: newEnd,
            total_hours: hours.totalHours,
            evening_hours: hours.eveningHours,
            night_hours: hours.nightHours,
            sunday_holiday_hours: hours.sundayHolidayHours,
            is_holiday: isSundayOrHoliday,
          })
          .eq("id", shift.id);

        if (updateError) throw updateError;
        updated++;
      }

      toast({
        title: `${updated} Schichten angepasst`,
        description: "Die Zeiten wurden erfolgreich überschrieben.",
      });

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["zt-summary-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["zt-shifts"] });
    } catch (err: any) {
      toast({
        title: "Fehler beim Anpassen",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (uniqueEmployees.length === 0) return null;

  const allSelected = selectedIds.size === uniqueEmployees.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Schichtzeiten anpassen (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Unter der Woche: <span className="font-medium text-foreground">17:00 – 01:00</span></p>
          <p>Sonn-/Feiertage: <span className="font-medium text-foreground">15:00 – 02:00</span></p>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {uniqueEmployees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-2">
              <Checkbox
                id={`override-${emp.id}`}
                checked={selectedIds.has(emp.id)}
                onCheckedChange={() => toggleEmployee(emp.id)}
              />
              <Label htmlFor={`override-${emp.id}`} className="text-sm cursor-pointer">
                {emp.nickname ? `${emp.nickname} – ` : ""}
                {[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.name}
                {emp.department ? ` (${emp.department})` : ""}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? "Keine auswählen" : "Alle auswählen"}
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size === 0 || isUpdating}
            onClick={handleApply}
          >
            {isUpdating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Zeiten anpassen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
