import { useState, useEffect, useRef, FormEvent } from 'react';
import { Store, Link2, Unlink, Smartphone, Loader2, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useRestaurants } from '@/hooks/useRestaurant';
import { useUnlinkedProfiles, useLinkedProfilesForStaff, useAdminLinkAccount } from '@/hooks/useProfiles';
import { useUserRole, useUpdateUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import type { PermissionLevel } from '@/types/permissions';
import { PERMISSION_LEVEL_INFO } from '@/types/permissions';
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
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [persoNr, setPersoNr] = useState('');
  const [role, setRole] = useState<StaffRole>('waiter');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('staff');

  const { data: restaurants = [] } = useRestaurants();
  const { data: unlinkedProfiles = [], isLoading: profilesLoading } = useUnlinkedProfiles();
  const { data: linkedProfiles = [], isLoading: linkedProfilesLoading } = useLinkedProfilesForStaff(staff?.id ?? null);
  const linkMutation = useAdminLinkAccount();
  const { data: currentRole, isLoading: roleLoading } = useUserRole(staff?.id);
  const updateRoleMutation = useUpdateUserRole();

  const didInitRef = useRef(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      didInitRef.current = false;
      setSelectedProfileId(null);
    }
  }, [open]);

  // Initialize form once when dialog opens (wait for currentRole to load for existing staff)
  useEffect(() => {
    if (!open || didInitRef.current) return;
    // For existing staff, wait until the role query has finished loading
    if (staff && roleLoading) return;

    if (staff) {
      setName(staff.name);
      setFirstName(staff.first_name ?? '');
      setLastName(staff.last_name ?? '');
      setNickname(staff.nickname ?? '');
      setPersoNr(staff.perso_nr != null ? String(staff.perso_nr) : '');
      setRole(staff.role);
      setIsActive(staff.is_active ?? true);
      setPinCode('');
      setSelectedRestaurants(staff.staff_restaurants?.map((sr) => sr.restaurant_id) ?? []);
      setPermissionLevel(currentRole || 'staff');
    } else {
      setName('');
      setFirstName('');
      setLastName('');
      setNickname('');
      setPersoNr('');
      setRole('waiter');
      setIsActive(true);
      setPinCode('');
      setSelectedRestaurants(restaurants.map((r) => r.id));
      setPermissionLevel('staff');
    }

    didInitRef.current = true;
  }, [open, staff, restaurants, currentRole, roleLoading]);

  const handlePinChange = (value: string) => {
    setPinCode(value.replace(/\D/g, '').slice(0, 4));
  };

  const toggleRestaurant = (id: string) => {
    setSelectedRestaurants((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Update permission level FIRST (before staff save closes the dialog and triggers refetch)
    if (staff && permissionLevel !== currentRole && user?.id) {
      try {
        await updateRoleMutation.mutateAsync({
          staffId: staff.id,
          permissionLevel,
          callerStaffId: user.id,
        });
      } catch {
        // Error toast is handled by the mutation's onError
        return;
      }
    }

    // Then save staff data (this closes the dialog and triggers the staff list refetch)
    onSave({
      name: name.trim(),
      role,
      is_active: isActive,
      pin_code: pinCode.length === 4 ? pinCode : undefined,
      restaurant_ids: selectedRestaurants,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      perso_nr: persoNr ? Number(persoNr) : undefined,
    });
  };

  const handleLink = () => {
    if (!staff || !selectedProfileId) return;
    linkMutation.mutate({
      staff_id: staff.id,
      profile_id: selectedProfileId,
      action: 'link',
    });
    setSelectedProfileId(null);
  };

  const handleUnlink = (profileId: string) => {
    if (!staff) return;
    linkMutation.mutate({
      staff_id: staff.id,
      profile_id: profileId,
      action: 'unlink',
    });
  };

  const isLoadingProfiles = profilesLoading || linkedProfilesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Vorname & Nachname */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="staff-firstname">Vorname</Label>
              <Input
                id="staff-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Vorname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-lastname">Nachname</Label>
              <Input
                id="staff-lastname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nachname"
              />
            </div>
          </div>

          {/* Spitzname & Personalnummer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="staff-nickname">Spitzname</Label>
              <Input
                id="staff-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Spitzname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-personr">Personalnummer</Label>
              <Input
                id="staff-personr"
                type="number"
                value={persoNr}
                onChange={(e) => setPersoNr(e.target.value)}
                placeholder="z.B. 101"
              />
            </div>
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
              <option value="waiter">Mitarbeiter</option>
              <option value="kitchen">Küche</option>
              <option value="both">Mitarbeiter & Küche</option>
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

          {/* Permission Level Section - only for existing staff */}
          {staff && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Berechtigungsstufe
                </Label>
                <div className="space-y-2">
                  {(Object.keys(PERMISSION_LEVEL_INFO) as PermissionLevel[]).map((level) => {
                    const info = PERMISSION_LEVEL_INFO[level];
                    const isSelected = permissionLevel === level;
                    return (
                      <label
                        key={level}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer
                          transition-all duration-200
                          ${isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="permission-level"
                          checked={isSelected}
                          onChange={() => setPermissionLevel(level)}
                          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {info.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {info.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* OAuth Linking Section - only for existing staff */}
          {staff && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  OAuth-Konten verknüpfen
                </Label>

                {isLoadingProfiles ? (
                  <div className="flex items-center gap-2 text-muted-foreground p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Lade Profile...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Currently linked accounts */}
                    {linkedProfiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Verknüpfte Konten:</p>
                        {linkedProfiles.map((profile) => (
                          <div
                            key={profile.id}
                            className="p-3 rounded-lg border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                  <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    {profile.email}
                                  </p>
                                  {profile.full_name && (
                                    <p className="text-xs text-green-700 dark:text-green-300">
                                      {profile.full_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlink(profile.id)}
                                disabled={linkMutation.isPending}
                                className="text-destructive border-destructive hover:bg-destructive/10"
                              >
                                {linkMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Unlink className="w-4 h-4 mr-1" />
                                    Aufheben
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Available unlinked profiles */}
                    {unlinkedProfiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {linkedProfiles.length > 0
                            ? 'Weitere Konten verfügbar:'
                            : 'Wähle einen OAuth-Benutzer zum Verknüpfen:'}
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                          {unlinkedProfiles.map((profile) => (
                            <label
                              key={profile.id}
                              className={`
                                flex items-center gap-3 p-2 rounded-md cursor-pointer
                                transition-all duration-200
                                ${selectedProfileId === profile.id
                                  ? 'bg-primary/10 border border-primary'
                                  : 'hover:bg-muted'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name="profile-link"
                                checked={selectedProfileId === profile.id}
                                onChange={() => setSelectedProfileId(profile.id)}
                                className="h-4 w-4 text-primary focus:ring-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {profile.email}
                                </p>
                                {profile.full_name && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {profile.full_name}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleLink}
                          disabled={!selectedProfileId || linkMutation.isPending}
                          className="w-full"
                        >
                          {linkMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Link2 className="w-4 h-4 mr-2" />
                          )}
                          Verknüpfen
                        </Button>
                      </div>
                    )}

                    {/* No profiles available */}
                    {linkedProfiles.length === 0 && unlinkedProfiles.length === 0 && (
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                        Keine OAuth-Benutzer verfügbar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

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
