import { useMemo, useState } from 'react';
import { useShiftAssignments, useAbsences } from '@/hooks/useDienstplan';
import { useSkills, useEmployeeSkills } from '@/hooks/useSkills';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRestaurantEmployees } from '@/hooks/useRestaurantEmployees';
import { ShiftCell } from './ShiftCell';

import { SkillCoverageRow } from './SkillCoverageRow';
import { AbsenceDialog } from './AbsenceDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyGridProps {
  department: 'kitchen' | 'service';
  month: number; // 0-indexed
  year: number;
}

function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' });
  const isSunday = d.getDay() === 0;
  return { day, weekday, isSunday };
}

function calcHours(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let hours = eh + em / 60 - (sh + sm / 60);
  if (hours < 0) hours += 24;
  return hours;
}

export function MonthlyGrid({ department, month, year }: MonthlyGridProps) {
  const { restaurantId } = useRestaurant();
  const dates = useMemo(() => getDatesInMonth(year, month), [year, month]);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: employees = [], isLoading: loadingEmp } = useRestaurantEmployees(restaurantId);
  const { data: shifts = [], isLoading: loadingShifts } = useShiftAssignments(department, startDate, endDate);
  const { data: skills = [] } = useSkills();
  const { data: allEmployeeSkills = [] } = useEmployeeSkills();

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const dept = e.department;
      if (department === 'kitchen') return dept === 'Küche';
      return dept === 'Service' || dept === 'GL';
    });
  }, [employees, department]);

  const staffIds = filteredEmployees.map(e => e.id);
  const { data: absences = [] } = useAbsences(staffIds, startDate, endDate);

  const [absenceTarget, setAbsenceTarget] = useState<{ staffId: string; staffName: string; absence?: any } | null>(null);

  const getAbsenceForDay = (staffId: string, date: string) => {
    return absences.find(a =>
      a.staff_id === staffId && a.start_date <= date && a.end_date >= date
    );
  };

  if (loadingEmp || loadingShifts) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (filteredEmployees.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        Keine Mitarbeiter in dieser Abteilung zugeordnet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="text-sm w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-2 text-left text-xs font-semibold sticky left-0 bg-muted/50 z-10 min-w-[160px]">
              Mitarbeiter
            </th>
            {dates.map(date => {
              const { day, weekday, isSunday } = formatDayHeader(date);
              return (
                <th
                  key={date}
                  className={`p-1 text-center text-[10px] min-w-[52px] border border-border/50 ${
                    isSunday ? 'bg-red-50 text-red-700' : ''
                  }`}
                >
                  <div>{weekday}</div>
                  <div className="font-bold">{day}</div>
                </th>
              );
            })}
            <th className="p-2 text-center text-xs font-semibold min-w-[60px] border border-border/50">Σ Std</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map(emp => {
            const empSkillIds = allEmployeeSkills
              .filter(es => es.staff_id === emp.id)
              .map(es => es.skill_id);

            const totalHours = shifts
              .filter(s => s.staff_id === emp.id)
              .reduce((sum, s) => sum + calcHours(s.start_time, s.end_time), 0);

            return (
              <tr key={emp.id} className="hover:bg-muted/30">
                <td className="p-2 sticky left-0 bg-background z-10 border border-border/50">
                  <span className="font-medium text-xs">{emp.name}</span>
                </td>
                {dates.map(date => {
                  const shift = shifts.find(s => s.staff_id === emp.id && s.shift_date === date);
                  const absence = getAbsenceForDay(emp.id, date);

                  return (
                    <ShiftCell
                      key={date}
                      shift={shift}
                      absenceType={absence?.absence_type}
                      staffId={emp.id}
                      date={date}
                      department={department}
                      restaurantId={restaurantId}
                      skills={skills}
                      employeeSkillIds={empSkillIds}
                      onAbsence={() => setAbsenceTarget({
                        staffId: emp.id,
                        staffName: emp.name,
                        absence: absence || undefined,
                      })}
                    />
                  );
                })}
                <td className="p-2 text-center text-xs font-semibold border border-border/50">
                  {totalHours.toFixed(1)}h
                </td>
              </tr>
            );
          })}
          {department === 'kitchen' && (
            <SkillCoverageRow dates={dates} shifts={shifts} skills={skills} category="kitchen" />
          )}
        </tbody>
      </table>

      {absenceTarget && (
        <AbsenceDialog
          open={!!absenceTarget}
          onOpenChange={(open) => { if (!open) setAbsenceTarget(null); }}
          staffId={absenceTarget.staffId}
          staffName={absenceTarget.staffName}
          absence={absenceTarget.absence}
        />
      )}
    </div>
  );
}
