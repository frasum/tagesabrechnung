import { useMemo, useState, useRef, useCallback } from 'react';
import { useShiftAssignments, useAbsences, useConflictingShifts } from '@/hooks/useDienstplan';
import { useSkills, useEmployeeSkills } from '@/hooks/useSkills';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRestaurantEmployees } from '@/hooks/useRestaurantEmployees';
import { ShiftCell } from './ShiftCell';
import { getPeriodRange } from '@/lib/periodUtils';

import { AbsenceDialog } from './AbsenceDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyGridProps {
  department: 'kitchen' | 'service';
  month: number;
  year: number;
}

function getPeriodDates(month0: number, year: number): string[] {
  const { start, end } = getPeriodRange(month0 + 1, year);
  const dates: string[] = [];
  const d = new Date(start);
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
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

export function MonthlyGrid({ department, month, year }: MonthlyGridProps) {
  const { restaurantId } = useRestaurant();
  const dates = useMemo(() => getPeriodDates(month, year), [year, month]);
  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: employees = [], isLoading: loadingEmp } = useRestaurantEmployees(restaurantId);
  const { data: shifts = [], isLoading: loadingShifts } = useShiftAssignments(department, startDate, endDate);
  const { data: skills = [] } = useSkills();
  const { data: allEmployeeSkills = [] } = useEmployeeSkills();

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter(e => {
      const dept = e.department;
      if (department === 'kitchen') return dept === 'Küche';
      return dept === 'Service' || dept === 'GL';
    });
    const unique = new Map<string, typeof filtered[0]>();
    for (const emp of filtered) {
      if (!unique.has(emp.id)) unique.set(emp.id, emp);
    }
    return Array.from(unique.values());
  }, [employees, department]);

  const birthdaySet = useMemo(() => {
    const set = new Set<string>();
    for (const emp of filteredEmployees) {
      if (!emp.date_of_birth) continue;
      const dobMD = emp.date_of_birth.slice(5); // "MM-DD"
      for (const date of dates) {
        if (date.slice(5) === dobMD) {
          set.add(`${emp.id}-${date}`);
        }
      }
    }
    return set;
  }, [filteredEmployees, dates]);

  const staffIds = filteredEmployees.map(e => e.id);
  const { data: absences = [] } = useAbsences(staffIds, startDate, endDate);
  const { data: conflictMap = new Map<string, string>() } = useConflictingShifts(restaurantId, staffIds, startDate, endDate);

  const [absenceTarget, setAbsenceTarget] = useState<{ staffId: string; staffName: string; absence?: any } | null>(null);

  // Keyboard navigation
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  const setCellRef = useCallback((rowIdx: number, colIdx: number, el: HTMLTableCellElement | null) => {
    const key = `${rowIdx}-${colIdx}`;
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedCell) {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setFocusedCell([0, 0]);
        e.preventDefault();
      }
      return;
    }

    const [row, col] = focusedCell;
    const maxRow = filteredEmployees.length - 1;
    const maxCol = dates.length - 1;
    let newRow = row;
    let newCol = col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        newRow = Math.min(maxRow, row + 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        newCol = Math.min(maxCol, col + 1);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const cellEl = cellRefs.current.get(`${row}-${col}`);
        const btn = cellEl?.querySelector('button');
        btn?.click();
        return;
      }
      case 'Escape':
        setFocusedCell(null);
        e.preventDefault();
        return;
      default:
        return;
    }

    setFocusedCell([newRow, newCol]);
    const nextEl = cellRefs.current.get(`${newRow}-${newCol}`);
    nextEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focusedCell, filteredEmployees.length, dates.length]);

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
    <div className="scrollbar-always-visible border rounded-lg min-w-0 max-w-full">
      <table
        className="text-sm w-full border-collapse"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (!focusedCell) setFocusedCell([0, 0]); }}
      >
        <thead>
          <tr className="bg-muted/50">
            <th className="p-2 text-left text-xs font-semibold sticky left-0 bg-muted/50 z-10 min-w-[160px]">
              Mitarbeiter
            </th>
            {dates.map(date => {
              const { day, weekday, isSunday } = formatDayHeader(date);
              const dateMonth = parseInt(date.split('-')[1], 10);
              const isPrevMonth = dateMonth !== month + 1;
              const isFirstOfMonth = day === 1;
              const isToday = date === todayStr;
              const dayShiftCount = shifts.filter(s => s.shift_date === date).length;
              return (
                <th
                  key={date}
                  className={`p-1 text-center text-[10px] min-w-[52px] border border-border/50 ${
                    isToday ? 'bg-primary/15 text-primary font-bold border-b-2 border-b-primary' : isSunday ? 'bg-red-50 text-red-700' : isPrevMonth ? 'bg-muted/80 text-muted-foreground' : ''
                  } ${isFirstOfMonth ? 'border-l-2 border-l-primary' : ''}`}
                >
                  <div>{weekday}</div>
                  <div className="font-bold">{day}</div>
                  {dayShiftCount > 0 && (
                    <div className="text-[9px] text-muted-foreground font-normal">{dayShiftCount}</div>
                  )}
                </th>
              );
            })}
            <th className="p-2 text-center text-xs font-semibold min-w-[60px] border border-border/50">Σ</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((emp, empIdx) => {
            const empSkillIds = allEmployeeSkills
              .filter(es => es.staff_id === emp.id)
              .map(es => es.skill_id);

            const shiftCount = shifts.filter(s => s.staff_id === emp.id).length;

            return (
              <tr key={emp.id} className="hover:bg-muted/30">
                <td className="p-2 sticky left-0 bg-background z-10 border border-border/50">
                  <span className="font-medium text-xs">{emp.name}</span>
                </td>
                {dates.map((date, dateIdx) => {
                  const shift = shifts.find(s => s.staff_id === emp.id && s.shift_date === date);
                  const absence = getAbsenceForDay(emp.id, date);
                  const isFocused = focusedCell?.[0] === empIdx && focusedCell?.[1] === dateIdx;
                  const isToday = date === todayStr;
                  const conflictRestaurant = conflictMap.get(`${emp.id}-${date}`);
                  const isBirthday = birthdaySet.has(`${emp.id}-${date}`);

                  return (
                    <ShiftCell
                      key={date}
                      ref={(el) => setCellRef(empIdx, dateIdx, el)}
                      shift={shift}
                      absenceType={absence?.absence_type}
                      staffId={emp.id}
                      date={date}
                      department={department}
                      restaurantId={restaurantId}
                      skills={skills}
                      employeeSkillIds={empSkillIds}
                       isFocused={isFocused}
                       isToday={isToday}
                       conflictRestaurant={conflictRestaurant}
                       isBirthday={isBirthday}
                      onAbsence={() => setAbsenceTarget({
                        staffId: emp.id,
                        staffName: emp.name,
                        absence: absence || undefined,
                      })}
                    />
                  );
                })}
                <td className="p-2 text-center text-xs font-semibold border border-border/50">
                  {shiftCount}
                </td>
              </tr>
            );
          })}
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
