import { useState, useEffect } from 'react';
import { Store } from 'lucide-react';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [persoNr, setPersoNr] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const { data: restaurants = [] } = useRestaurants();

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return;
    
    // Reset to initial state
    if (staff) {
      // Editing existing staff
      setName(staff.name);
      setFirstName(staff.first_name ?? '');
      setLastName(staff.last_name ?? '');
      setNickname(staff.nickname ?? '');
      setPersoNr(staff.perso_nr ? String(staff.perso_nr) : '');
      setRole(staff.role);
      setIsActive(staff.is_active ?? true);
      setPinCode('');
      setSelectedRestaurants(staff.staff_restaurants?.map(sr => sr.restaurant_id) ?? []);
    } else {
      // Creating new staff - start with empty selection
      setName('');
      setFirstName('');
      setLastName('');
      setNickname('');
      setPersoNr('');
      setRole('waiter');
      setIsActive(true);
      setPinCode('');
      setSelectedRestaurants([]);
    }
  }, [open, staff]);

  const handlePinChange = (value: string) => {
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
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      perso_nr: persoNr ? parseInt(persoNr, 10) : undefined,
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
            <Label htmlFor="name">Anzeigename *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nickname">Spitzname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Maxi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="persoNr">Perso-Nr.</Label>
              <Input
                id="persoNr"
                type="number"
                value={persoNr}
                onChange={(e) => setPersoNr(e.target.value)}
                placeholder="z.B. 42"
              />
            </div>
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
                <SelectItem value="both">Mitarbeiter & Küche</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Restaurant Assignment */}
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
                      ${isSelected 
                        ? 'border-primary bg-primary/10 shadow-sm' 
                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                      }
                    `}
                  >
                    <Checkbox
                      id={`restaurant-${restaurant.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => 
                        handleRestaurantToggle(restaurant.id, checked as boolean)
                      }
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {restaurant.name}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-scale-in" />
                    )}
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
