import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/shared/CurrencyInput';

interface BankDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { deposit_date: string; amount: number; notes?: string }) => void;
  isSubmitting?: boolean;
  defaultAmount?: number;
}

export function BankDepositDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  defaultAmount = 0,
}: BankDepositDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [notes, setNotes] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Pre-fill amount with the suggested default when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
    }
  }, [open, defaultAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || amount <= 0) return;

    onSubmit({
      deposit_date: format(date, 'yyyy-MM-dd'),
      amount,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setDate(new Date());
    setAmount(defaultAmount);
    setNotes('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setDate(new Date());
    setAmount(defaultAmount);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Bankeinzahlung hinzufügen
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setCalendarOpen(false);
                  }}
                  locale={de}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Betrag</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onChange={setAmount}
              placeholder="0,00 €"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notiz (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Wochenbetrag, Monatsendzahlung..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!date || amount <= 0 || isSubmitting}>
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
