import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useRestaurants } from '@/hooks/useRestaurant';

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
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const { data: restaurants = [] } = useRestaurants();

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setIsActive(staff.is_active ?? true);
      setPinCode(''); // Don't show existing PIN
      // Get restaurant IDs from the staff_restaurants relation
      const restaurantIds = staff.staff_restaurants?.map(sr => sr.restaurant_id) ?? [];
      setSelectedRestaurants(restaurantIds);
    } else {
      setName('');
      setRole('waiter');
      setIsActive(true);
      setPinCode('');
      // Default to all restaurants for new staff
      setSelectedRestaurants(restaurants.map(r => r.id));
    }
  }, [staff, open, restaurants]);

  const handlePinChange = (value: string) => {
    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(sanitized);
  };

  const handleRestaurantToggle = (restaurantId: string, checked: boolean) => {
    if (checked) {
      setSelectedRestaurants(prev => [...prev, restaurantId]);
    } else {
      setSelectedRestaurants(prev => prev.filter(id => id !== restaurantId));
    }
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

          {/* Restaurant Assignment */}
          <div className="space-y-3">
            <Label>Restaurants *</Label>
            <div className="space-y-2">
              {restaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`restaurant-${restaurant.id}`}
                    checked={selectedRestaurants.includes(restaurant.id)}
                    onCheckedChange={(checked) => 
                      handleRestaurantToggle(restaurant.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`restaurant-${restaurant.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {restaurant.name}
                  </Label>
                </div>
              ))}
            </div>
            {selectedRestaurants.length === 0 && (
              <p className="text-xs text-destructive">
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
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim() || selectedRestaurants.length === 0}
            >
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
