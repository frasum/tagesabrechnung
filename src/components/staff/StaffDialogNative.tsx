import { useState, useEffect, useRef, FormEvent } from 'react';
import { Store } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useRestaurants } from '@/hooks/useRestaurant';

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  onSave: (data: StaffInput) => void;
  isLoading?: boolean;
}

/**
 * Minimal Dialog without Radix Select/Checkbox to avoid compose-refs bug.
 */
export function StaffDialog({ open, onOpenChange, staff, onSave, isLoading }: StaffDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const { data: restaurants = [] } = useRestaurants();

  const didInitRef = useRef(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      didInitRef.current = false;
    }
  }, [open]);

  // Initialize form once when dialog opens
  useEffect(() => {
    if (!open || didInitRef.current) return;

    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setIsActive(staff.is_active ?? true);
      setPinCode('');
      setSelectedRestaurants(staff.staff_restaurants?.map((sr) => sr.restaurant_id) ?? []);
    } else {
      setName('');
      setRole('waiter');
      setIsActive(true);
      setPinCode('');
      // Default to all restaurants for new staff
      setSelectedRestaurants(restaurants.map((r) => r.id));
    }

    didInitRef.current = true;
  }, [open, staff, restaurants]);

  const handlePinChange = (value: string) => {
    setPinCode(value.replace(/\D/g, '').slice(0, 4));
  };

  const toggleRestaurant = (id: string) => {
    setSelectedRestaurants((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      role,
      is_active: isActive,
      pin_code: pinCode.length === 4 ? pinCode : undefined,
      restaurant_ids: selectedRestaurants,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{staff ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name *</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>

          {/* Role - native select */}
          <div className="space-y-2">
            <Label htmlFor="staff-role">Rolle *</Label>
            <select
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="waiter">Kellner</option>
              <option value="kitchen">Küche</option>
            </select>
          </div>

          {/* Restaurants - native checkboxes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Arbeitet in folgenden Restaurants
            </Label>
            <div className="grid gap-2">
              {restaurants.map((restaurant) => {
                const isSelected = selectedRestaurants.includes(restaurant.id);
                return (
                  <label
                    key={restaurant.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                      transition-all duration-200
                      ${isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRestaurant(restaurant.id)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {restaurant.name}
                    </span>
                    {isSelected && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                  </label>
                );
              })}
            </div>
            {selectedRestaurants.length === 0 && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                Mindestens ein Restaurant muss ausgewählt werden
              </p>
            )}
          </div>

          {/* PIN Code */}
          <div className="space-y-2">
            <Label htmlFor="staff-pin">Login-Code (4 Ziffern)</Label>
            <Input
              id="staff-pin"
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

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="staff-active">Aktiv</Label>
            <Switch id="staff-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || selectedRestaurants.length === 0}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
