import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Staff, StaffInput, StaffRole } from '@/hooks/useStaff';

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  onSave: (data: StaffInput) => void;
  isLoading?: boolean;
}

export function StaffDialog({ open, onOpenChange, staff, onSave, isLoading }: StaffDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setPhone(staff.phone || '');
      setHourlyRate(staff.hourly_rate?.toString() || '');
      setNotes(staff.notes || '');
      setIsActive(staff.is_active ?? true);
      setPinCode(''); // Don't show existing PIN
    } else {
      setName('');
      setRole('waiter');
      setPhone('');
      setHourlyRate('');
      setNotes('');
      setIsActive(true);
      setPinCode('');
    }
  }, [staff, open]);

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(sanitized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      role,
      phone: phone.trim() || undefined,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      notes: notes.trim() || undefined,
      is_active: isActive,
      pin_code: pinCode.length === 4 ? pinCode : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {staff ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rolle *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiter">Kellner</SelectItem>
                <SelectItem value="kitchen">Küche</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pinCode">Login-Code (4 Ziffern)</Label>
            <Input
              id="pinCode"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinCode}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder={staff ? '••••  (leer = unverändert)' : '••••'}
              maxLength={4}
              className="tracking-[0.3em]"
            />
            <p className="text-xs text-muted-foreground">
              {staff ? 'Leer lassen um den bestehenden Code zu behalten' : 'Für die Anmeldung in der App'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Stundenlohn (€)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="12.50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Aktiv</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
