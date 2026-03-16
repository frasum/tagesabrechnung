import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPeriodRange } from '@/lib/periodUtils';

interface DienstplanToolbarProps {
  month: number; // 0-indexed
  year: number;
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

export function DienstplanToolbar({ month, year, onMonthChange }: DienstplanToolbarProps) {
  const prev = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };
  const next = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-semibold min-w-[220px] text-center">
        {formatPeriodLabel(month, year)}
      </span>
      <Button variant="outline" size="icon" onClick={next} className="h-8 w-8">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
