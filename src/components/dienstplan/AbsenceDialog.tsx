import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useUpsertAbsence, useDeleteAbsence, type Absence } from '@/hooks/useDienstplan';
import { toast } from 'sonner';

interface AbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  absence?: Absence | null;
}

export function AbsenceDialog({ open, onOpenChange, staffId, staffName, absence }: AbsenceDialogProps) {
  const [type, setType] = useState<'vacation' | 'sick'>(
    (absence?.absence_type as 'vacation' | 'sick') || 'vacation'
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    absence ? new Date(absence.start_date + 'T00:00:00') : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    absence ? new Date(absence.end_date + 'T00:00:00') : undefined
  );
  const [notes, setNotes] = useState(absence?.notes || '');

  const upsertAbsence = useUpsertAbsence();
  const deleteAbsence = useDeleteAbsence();

  const handleSave = () => {
    if (!startDate || !endDate) {
      toast.error('Bitte Start- und Enddatum wählen');
      return;
    }
    if (endDate < startDate) {
      toast.error('Enddatum muss nach Startdatum liegen');
      return;
    }

    upsertAbsence.mutate(
      {
        id: absence?.id,
        staff_id: staffId,
        absence_type: type,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Abwesenheit gespeichert');
          onOpenChange(false);
        },
        onError: () => toast.error('Fehler beim Speichern'),
      }
    );
  };

  const handleDelete = () => {
    if (!absence?.id) return;
    deleteAbsence.mutate(absence.id, {
      onSuccess: () => {
        toast.success('Abwesenheit gelöscht');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {absence ? 'Abwesenheit bearbeiten' : 'Abwesenheit eintragen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{staffName}</p>

          {/* Type selection */}
          <div className="space-y-2">
            <Label>Art</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('vacation')}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                  type === 'vacation'
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                )}
              >
                🏖️ Urlaub
              </button>
              <button
                type="button"
                onClick={() => setType('sick')}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                  type === 'sick'
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                )}
              >
                🤒 Krank
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Von</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-9 text-xs',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {startDate ? format(startDate, 'dd.MM.yy') : 'Datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={de}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bis</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-9 text-xs',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {endDate ? format(endDate, 'dd.MM.yy') : 'Datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={de}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs">Notiz (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="z.B. ärztliches Attest vorhanden"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {absence && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteAbsence.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Löschen
            </Button>
          )}
          <Button onClick={handleSave} disabled={upsertAbsence.isPending || !startDate || !endDate}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
