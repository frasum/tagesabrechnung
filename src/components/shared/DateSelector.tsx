import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateSelectorProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ date, onDateChange }: DateSelectorProps) {
  const goToPreviousDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={goToPreviousDay}
        className="shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[200px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "EEEE, d. MMMM yyyy", { locale: de })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            locale={de}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNextDay}
        className="shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday && (
        <Button variant="secondary" size="sm" onClick={goToToday}>
          Heute
        </Button>
      )}
    </div>
  );
}
