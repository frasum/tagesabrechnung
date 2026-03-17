import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { getPeriodRange } from '@/lib/periodUtils';
import { useShiftAssignments, useBatchInsertShifts, useConflictingShifts } from '@/hooks/useDienstplan';
import { useRestaurant } from '@/hooks/useRestaurant';
import { toast } from 'sonner';

interface DienstplanToolbarProps {
  month: number; // 0-indexed
  year: number;
  department: 'kitchen' | 'service';
  onMonthChange: (month: number, year: number) => void;
}

const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatPeriodLabel(month0: number, year: number) {
  const { start, end } = getPeriodRange(month0 + 1, year);
  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
  return `${monthNames[month0]} ${year} (${fmt(start)}–${fmt(end)}${end.getFullYear()})`;
}

function getCurrentWeekDates(): { thisWeekStart: Date; prevWeekStart: Date; prevWeekEnd: Date; thisWeekEnd: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Monday-based week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() + mondayOffset);
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  const prevWeekStart = new Date(thisWeekStart);
  prevWeekStart.setDate(thisWeekStart.getDate() - 7);

  const prevWeekEnd = new Date(thisWeekStart);
  prevWeekEnd.setDate(thisWeekStart.getDate() - 1);

  return { thisWeekStart, thisWeekEnd, prevWeekStart, prevWeekEnd };
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DienstplanToolbar({ month, year, department, onMonthChange }: DienstplanToolbarProps) {
  const { restaurantId } = useRestaurant();
  const [copying, setCopying] = useState(false);
  const batchInsert = useBatchInsertShifts();

  const { thisWeekStart, thisWeekEnd, prevWeekStart, prevWeekEnd } = getCurrentWeekDates();
  const prevStart = toDateStr(prevWeekStart);
  const prevEnd = toDateStr(prevWeekEnd);
  const thisStart = toDateStr(thisWeekStart);
  const thisEnd = toDateStr(thisWeekEnd);

  const { data: prevWeekShifts } = useShiftAssignments(department, prevStart, prevEnd);
  const { data: thisWeekShifts } = useShiftAssignments(department, thisStart, thisEnd);

  // Get unique staff IDs from previous week for conflict check
  const prevWeekStaffIds = useMemo(() => {
    if (!prevWeekShifts) return [];
    return [...new Set(prevWeekShifts.map(s => s.staff_id))];
  }, [prevWeekShifts]);

  const { data: conflicts } = useConflictingShifts(restaurantId, prevWeekStaffIds, thisStart, thisEnd);

  const prev = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };
  const next = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  const handleCopyWeek = () => {
    if (!prevWeekShifts || prevWeekShifts.length === 0) {
      toast.error('Keine Schichten in der Vorwoche vorhanden');
      return;
    }

    // Calculate day offset (7 days forward)
    const existingKeys = new Set(
      (thisWeekShifts || []).map(s => `${s.staff_id}_${s.shift_date}`)
    );

    let skippedConflicts = 0;
    const newShifts = prevWeekShifts
      .map(s => {
        const oldDate = new Date(s.shift_date + 'T00:00:00');
        const newDate = new Date(oldDate);
        newDate.setDate(oldDate.getDate() + 7);
        const newDateStr = toDateStr(newDate);
        const key = `${s.staff_id}_${newDateStr}`;

        if (existingKeys.has(key)) return null;

        // Skip if staff has cross-restaurant conflict
        if (conflicts?.has(`${s.staff_id}-${newDateStr}`)) {
          skippedConflicts++;
          return null;
        }

        return {
          staff_id: s.staff_id,
          restaurant_id: s.restaurant_id,
          department: s.department,
          shift_date: newDateStr,
          start_time: s.start_time,
          end_time: s.end_time,
          assigned_skill_id: s.assigned_skill_id,
          notes: s.notes,
        };
      })
      .filter(Boolean) as any[];

    if (newShifts.length === 0) {
      if (skippedConflicts > 0) {
        toast.info(`${skippedConflicts} Schichten wegen Standort-Konflikten übersprungen`);
      } else {
        toast.info('Alle Tage der aktuellen Woche sind bereits belegt');
      }
      return;
    }

    setCopying(true);
    batchInsert.mutate(newShifts, {
      onSuccess: () => {
        const msg = skippedConflicts > 0
          ? `${newShifts.length} Schichten kopiert, ${skippedConflicts} wegen Konflikten übersprungen`
          : `${newShifts.length} Schichten aus Vorwoche kopiert`;
        toast.success(msg);
        setCopying(false);
      },
      onError: () => {
        toast.error('Fehler beim Kopieren');
        setCopying(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-semibold min-w-[220px] text-center">
        {formatPeriodLabel(month, year)}
      </span>
      <Button variant="outline" size="icon" onClick={next} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyWeek}
        disabled={copying || !prevWeekShifts || prevWeekShifts.length === 0}
        className="ml-auto h-8 text-xs gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" />
        Vorwoche kopieren
      </Button>
    </div>
  );
}
