import { useEffect, useRef, useState } from 'react';
import { Store } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
 * Loop-safe dialog: initialization is guarded with refs so changes in fetched data
 * (e.g. new restaurants array identity) won't cause state re-initialization loops.
 */
export function StaffDialog({ open, onOpenChange, staff, onSave, isLoading }: StaffDialogProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const { data: restaurants = [] } = useRestaurants();

  const didInitRef = useRef(false);
  const didDefaultRestaurantsRef = useRef(false);

  // Reset guards when closing
  useEffect(() => {
    if (open) return;
    didInitRef.current = false;
    didDefaultRestaurantsRef.current = false;
  }, [open]);

  // Initialize base fields once per open
  useEffect(() => {
    if (!open) return;
    if (didInitRef.current) return;

    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setIsActive(staff.is_active ?? true);
      setPinCode('');
      setSelectedRestaurants(staff.staff_restaurants?.map((sr) => sr.restaurant_id) ?? []);
      didDefaultRestaurantsRef.current = true; // don't auto-default when editing
    } else {
      setName('');
      setRole('waiter');
      setIsActive(true);
      setPinCode('');
      setSelectedRestaurants([]);
    }

    didInitRef.current = true;
  }, [open, staff]);

  // For NEW staff only: default to all restaurants once restaurants are loaded
  useEffect(() => {
    if (!open) return;
    if (staff) return;
    if (didDefaultRestaurantsRef.current) return;
    if (restaurants.length === 0) return;

    setSelectedRestaurants(restaurants.map((r) => r.id));
    didDefaultRestaurantsRef.current = true;
  }, [open, staff, restaurants.length]);

  const handlePinChange = (value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(sanitized);
  };

  const handleRestaurantToggle = (restaurantId: string, checked: boolean) => {
    setSelectedRestaurants((prev) => {
      if (checked) return prev.includes(restaurantId) ? prev : [...prev, restaurantId];
      return prev.filter((id) => id !== restaurantId);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
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
                <SelectItem value="waiter">Mitarbeiter</SelectItem>
                <SelectItem value="kitchen">Küche</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Arbeitet in folgenden Restaurants
            </Label>
            <div className="grid gap-2">
              {restaurants.map((restaurant) => {
                const isSelected = selectedRestaurants.includes(restaurant.id);
                return (
                  <div
                    key={restaurant.id}
                    onClick={() => handleRestaurantToggle(restaurant.id, !isSelected)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer
                      transition-all duration-200
                      ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                      }
                    `}
                  >
                    <Checkbox
                      id={`restaurant-${restaurant.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleRestaurantToggle(restaurant.id, checked as boolean)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {restaurant.name}
                      </span>
                    </div>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary animate-scale-in" />}
                  </div>
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

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Aktiv</Label>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
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
