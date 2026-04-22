import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Landmark, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  // Reset all form fields whenever the dialog opens — guarantees a clean state
  // regardless of how it was previously closed (button, overlay click, ESC).
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setDate(new Date());
      setNotes('');
      setCalendarOpen(false);
    }
  }, [open, defaultAmount]);

  // Maximum allowed amount = possible deposit (preserves the change fund).
  // When defaultAmount is 0, no deposit is possible at all.
  const maxAmount = defaultAmount;
  const exceedsLimit = amount > maxAmount + 0.001;
  const noDepositPossible = maxAmount <= 0;

  const formatEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || amount <= 0 || exceedsLimit || noDepositPossible) return;

    onSubmit({
      deposit_date: format(date, 'yyyy-MM-dd'),
      amount,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Betrag</Label>
              {!noDepositPossible && (
                <span className="text-xs text-muted-foreground">
                  Max. {formatEur(maxAmount)}
                </span>
              )}
            </div>
            <CurrencyInput
              id="amount"
              value={amount}
              onChange={setAmount}
              placeholder="0,00 €"
              className={cn(exceedsLimit && 'border-destructive focus-visible:ring-destructive')}
            />
            {noDepositPossible && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aktuell ist keine Einzahlung möglich, ohne den Wechselgeld-Sockel anzutasten.
                </AlertDescription>
              </Alert>
            )}
            {!noDepositPossible && exceedsLimit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Betrag überschreitet die mögliche Einzahlung von {formatEur(maxAmount)}.
                  Andernfalls würde der Wechselgeld-Sockel angetastet.
                </AlertDescription>
              </Alert>
            )}
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
            <Button
              type="submit"
              disabled={!date || amount <= 0 || exceedsLimit || noDepositPossible || isSubmitting}
            >
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
