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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPrevMonth(month0: number, year: number): { month: number; year: number } {
  if (month0 === 0) return { month: 11, year: year - 1 };
  return { month: month0 - 1, year };
}

export function DienstplanToolbar({ month, year, department, onMonthChange }: DienstplanToolbarProps) {
  const { restaurantId } = useRestaurant();
  const [copying, setCopying] = useState(false);
  const batchInsert = useBatchInsertShifts();

  // Current period range (month is 0-indexed, getPeriodRange expects 1-indexed)
  const currentPeriod = useMemo(() => getPeriodRange(month + 1, year), [month, year]);
  const currentStart = toDateStr(currentPeriod.start);
  const currentEnd = toDateStr(currentPeriod.end);

  // Previous period range
  const prev = getPrevMonth(month, year);
  const prevPeriod = useMemo(() => getPeriodRange(prev.month + 1, prev.year), [prev.month, prev.year]);
  const prevStart = toDateStr(prevPeriod.start);
  const prevEnd = toDateStr(prevPeriod.end);

  const { data: prevMonthShifts } = useShiftAssignments(department, prevStart, prevEnd);
  const { data: currentMonthShifts } = useShiftAssignments(department, currentStart, currentEnd);

  const prevMonthStaffIds = useMemo(() => {
    if (!prevMonthShifts) return [];
    return [...new Set(prevMonthShifts.map(s => s.staff_id))];
  }, [prevMonthShifts]);

  const { data: conflicts } = useConflictingShifts(restaurantId, department, prevMonthStaffIds, currentStart, currentEnd);

  const handlePrev = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };
  const handleNext = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  const handleCopyMonth = () => {
    if (!prevMonthShifts || prevMonthShifts.length === 0) {
      toast.error('Keine Schichten im Vormonat vorhanden');
      return;
    }

    const existingKeys = new Set(
      (currentMonthShifts || []).map(s => `${s.staff_id}_${s.shift_date}`)
    );

    const prevPeriodStartTime = prevPeriod.start.getTime();
    const currentPeriodStartTime = currentPeriod.start.getTime();
    const currentPeriodEndTime = currentPeriod.end.getTime();

    let skippedConflicts = 0;
    let skippedOutOfRange = 0;

    const newShifts = prevMonthShifts
      .map(s => {
        const oldDate = new Date(s.shift_date + 'T00:00:00');
        const dayOffset = Math.round((oldDate.getTime() - prevPeriodStartTime) / (1000 * 60 * 60 * 24));
        const newDate = new Date(currentPeriodStartTime + dayOffset * 24 * 60 * 60 * 1000);

        if (newDate.getTime() > currentPeriodEndTime) {
          skippedOutOfRange++;
          return null;
        }

        const newDateStr = toDateStr(newDate);
        const key = `${s.staff_id}_${newDateStr}`;

        if (existingKeys.has(key)) return null;

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
        toast.info('Alle Tage des aktuellen Monats sind bereits belegt');
      }
      return;
    }

    setCopying(true);
    batchInsert.mutate(newShifts, {
      onSuccess: () => {
        const parts = [`${newShifts.length} Schichten aus Vormonat kopiert`];
        if (skippedConflicts > 0) parts.push(`${skippedConflicts} wegen Konflikten übersprungen`);
        if (skippedOutOfRange > 0) parts.push(`${skippedOutOfRange} außerhalb der Periode`);
        toast.success(parts.join(', '));
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
      <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-semibold min-w-[220px] text-center">
        {formatPeriodLabel(month, year)}
      </span>
      <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyMonth}
        disabled={copying || !prevMonthShifts || prevMonthShifts.length === 0}
        className="ml-auto h-8 text-xs gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" />
        Vormonat kopieren
      </Button>
    </div>
  );
}
