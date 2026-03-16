import { useState, useEffect, useRef, FormEvent } from 'react';
import { Store, Link2, Unlink, Smartphone, Loader2, Shield, ChevronDown, Utensils } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { rolesToEnum } from '@/hooks/useStaff';
import type { Staff, StaffInput, StaffRole } from '@/hooks/useStaff';
import { useRestaurants } from '@/hooks/useRestaurant';
import { useUnlinkedProfiles, useLinkedProfilesForStaff, useAdminLinkAccount } from '@/hooks/useProfiles';
import { useUserRole, useUpdateUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import type { PermissionLevel } from '@/types/permissions';
import { PERMISSION_LEVEL_INFO } from '@/types/permissions';
import { useSkills, useEmployeeSkills, useToggleEmployeeSkill } from '@/hooks/useSkills';
import { SkillBadge } from '@/components/dienstplan/SkillBadge';
interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  onSave: (data: StaffInput) => void;
  isLoading?: boolean;
}

function SkillsSection({ staffId }: { staffId: string }) {
  const { data: skills = [] } = useSkills();
  const { data: empSkills = [] } = useEmployeeSkills([staffId]);
  const toggleSkill = useToggleEmployeeSkill();

  const empSkillIds = empSkills.filter(es => es.staff_id === staffId).map(es => es.skill_id);

  return (
    <>
      <Separator />
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
          <Label className="text-base font-semibold cursor-pointer flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            Skills / Posten
          </Label>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => {
              const hasSkill = empSkillIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill.mutate({ staffId, skillId: skill.id, hasSkill })}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    border-2 transition-all cursor-pointer
                    ${hasSkill
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/50'
                    }
                  `}
                  style={hasSkill ? { backgroundColor: skill.color } : undefined}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Skills bestimmen, welche Posten im Dienstplan zugewiesen werden können.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

/**
 * Minimal Dialog without Radix Select/Checkbox to avoid compose-refs bug.
 */
export function StaffDialog({ open, onOpenChange, staff, onSave, isLoading }: StaffDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [persoNr, setPersoNr] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [participatesInPool, setParticipatesInPool] = useState(true);
  const [restaurantDepts, setRestaurantDepts] = useState<Record<string, Set<string>>>({});
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('staff');
  // Payroll state
  const [hourlyRate, setHourlyRate] = useState('');
  const [taxClass, setTaxClass] = useState('');
  const [taxId, setTaxId] = useState('');
  const [socialSecurityNr, setSocialSecurityNr] = useState('');
  const [healthInsurance, setHealthInsurance] = useState('');
  const [nationality, setNationality] = useState('');
  const [personnelGroup, setPersonnelGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [employmentStart, setEmploymentStart] = useState('');
  const [employmentEnd, setEmploymentEnd] = useState('');
  const [isMinijob, setIsMinijob] = useState(false);
  const [isSvExempt, setIsSvExempt] = useState(false);
  const [vacDaysContractual, setVacDaysContractual] = useState('');
  const [vacDaysPrevious, setVacDaysPrevious] = useState('');
  const [vacDaysCurrent, setVacDaysCurrent] = useState('');
  const [vacDaysTaken, setVacDaysTaken] = useState('');
  const [sickDaysTotal, setSickDaysTotal] = useState('');

  const { data: restaurants = [] } = useRestaurants();
  const { data: unlinkedProfiles = [], isLoading: profilesLoading } = useUnlinkedProfiles();
  const { data: linkedProfiles = [], isLoading: linkedProfilesLoading } = useLinkedProfilesForStaff(staff?.id ?? null);
  const linkMutation = useAdminLinkAccount();
  const { data: currentRole } = useUserRole(staff?.id);
  const updateRoleMutation = useUpdateUserRole();

  const didInitRef = useRef(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      didInitRef.current = false;
      setSelectedProfileId(null);
    }
  }, [open]);

  // Initialize form once when dialog opens
  useEffect(() => {
    if (!open || didInitRef.current) return;

    if (staff) {
      setName(staff.name);
      setFirstName(staff.first_name ?? '');
      setLastName(staff.last_name ?? '');
      setPersoNr(staff.perso_nr != null ? String(staff.perso_nr) : '');
      setIsActive(staff.is_active ?? true);
      setParticipatesInPool(staff.participates_in_pool ?? true);
      setPinCode('');
      // Payroll init
      setHourlyRate(staff.hourly_rate != null ? String(staff.hourly_rate) : '');
      setTaxClass(staff.tax_class ?? '');
      setTaxId(staff.tax_id ?? '');
      setSocialSecurityNr(staff.social_security_nr ?? '');
      setHealthInsurance(staff.health_insurance ?? '');
      setNationality(staff.nationality ?? '');
      setPersonnelGroup(staff.personnel_group ?? '');
      setDateOfBirth(staff.date_of_birth ?? '');
      setEmploymentStart(staff.employment_start ?? '');
      setEmploymentEnd(staff.employment_end ?? '');
      setIsMinijob(staff.is_minijob ?? false);
      setIsSvExempt(staff.is_sv_exempt ?? false);
      setVacDaysContractual(staff.vacation_days_contractual != null ? String(staff.vacation_days_contractual) : '');
      setVacDaysPrevious(staff.vacation_days_previous != null ? String(staff.vacation_days_previous) : '');
      setVacDaysCurrent(staff.vacation_days_current != null ? String(staff.vacation_days_current) : '');
      setVacDaysTaken(staff.vacation_days_taken != null ? String(staff.vacation_days_taken) : '');
      setSickDaysTotal(staff.sick_days_total != null ? String(staff.sick_days_total) : '');
      // Build restaurantDepts from existing staff_restaurants
      const depts: Record<string, Set<string>> = {};
      for (const sr of staff.staff_restaurants ?? []) {
        if (!depts[sr.restaurant_id]) depts[sr.restaurant_id] = new Set();
        if (sr.zt_department) depts[sr.restaurant_id].add(sr.zt_department);
      }
      setRestaurantDepts(depts);
      setPermissionLevel(currentRole || 'staff');
    } else {
      setName('');
      setFirstName('');
      setLastName('');
      setPersoNr('');
      setIsActive(true);
      setParticipatesInPool(true);
      setPinCode('');
      // Payroll reset
      setHourlyRate('');
      setTaxClass(''); setTaxId(''); setSocialSecurityNr(''); setHealthInsurance('');
      setNationality(''); setPersonnelGroup(''); setDateOfBirth('');
      setEmploymentStart(''); setEmploymentEnd('');
      setIsMinijob(false); setIsSvExempt(false);
      setVacDaysContractual(''); setVacDaysPrevious(''); setVacDaysCurrent('');
      setVacDaysTaken(''); setSickDaysTotal('');
      // For new staff, select all restaurants with no departments yet
      const depts: Record<string, Set<string>> = {};
      restaurants.forEach((r) => { depts[r.id] = new Set(); });
      setRestaurantDepts(depts);
      setPermissionLevel('staff');
    }

    didInitRef.current = true;
  }, [open, staff, restaurants, currentRole]);

  const handlePinChange = (value: string) => {
    setPinCode(value.replace(/\D/g, '').slice(0, 4));
  };

  const toggleRestaurant = (id: string) => {
    setRestaurantDepts((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = new Set();
      }
      return next;
    });
  };

  const toggleDept = (restaurantId: string, dept: string) => {
    setRestaurantDepts((prev) => {
      const next = { ...prev };
      const depts = new Set(next[restaurantId] ?? []);
      if (depts.has(dept)) {
        depts.delete(dept);
      } else {
        depts.add(dept);
      }
      next[restaurantId] = depts;
      return next;
    });
  };

  const selectedRestaurantIds = Object.keys(restaurantDepts);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Derive role from all department assignments
    const allDepts = new Set<string>();
    Object.values(restaurantDepts).forEach(depts => depts.forEach(d => allDepts.add(d)));
    if (allDepts.size === 0) return;

    const role = rolesToEnum(allDepts.has('Service'), allDepts.has('Küche'), allDepts.has('GL'));

    // Build restaurant_assignments from restaurantDepts
    const restaurant_assignments = Object.entries(restaurantDepts).flatMap(([rid, depts]) =>
      depts.size > 0
        ? Array.from(depts).map((dept) => ({ restaurant_id: rid, zt_department: dept }))
        : [{ restaurant_id: rid, zt_department: null }]
    );

    const toInt = (v: string) => v ? parseInt(v, 10) : null;

    // Save staff data
    onSave({
      name: name.trim(),
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      perso_nr: persoNr ? Number(persoNr) : undefined,
      role,
      is_active: isActive,
      participates_in_pool: participatesInPool,
      pin_code: pinCode.length === 4 ? pinCode : undefined,
      restaurant_assignments,
      // Payroll
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      tax_class: taxClass || null,
      tax_id: taxId || null,
      social_security_nr: socialSecurityNr || null,
      health_insurance: healthInsurance || null,
      nationality: nationality || null,
      personnel_group: personnelGroup || null,
      date_of_birth: dateOfBirth || null,
      employment_start: employmentStart || null,
      employment_end: employmentEnd || null,
      is_minijob: isMinijob,
      is_sv_exempt: isSvExempt,
      vacation_days_contractual: toInt(vacDaysContractual),
      vacation_days_previous: toInt(vacDaysPrevious),
      vacation_days_current: toInt(vacDaysCurrent),
      vacation_days_taken: toInt(vacDaysTaken),
      sick_days_total: toInt(sickDaysTotal),
    });

    // Update permission level for existing staff
    if (staff && permissionLevel !== currentRole && user?.id) {
      updateRoleMutation.mutate({
        staffId: staff.id,
        permissionLevel,
        callerStaffId: user.id,
      });
    }
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
            <Label htmlFor="staff-name">Spitzname *</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maxi"
              required
            />
          </div>

          {/* Stammdaten */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="staff-lastname">Nachname</Label>
              <Input
                id="staff-lastname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-firstname">Vorname</Label>
              <Input
                id="staff-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
              />
            </div>
          </div>

          {/* Restaurants with department checkboxes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              Arbeitet in folgenden Restaurants
            </Label>
            <div className="grid gap-2">
              {restaurants.map((restaurant) => {
                const isSelected = restaurant.id in restaurantDepts;
                const depts = restaurantDepts[restaurant.id] ?? new Set();
                return (
                  <div
                    key={restaurant.id}
                    className={`
                      rounded-lg border-2 transition-all duration-200
                      ${isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                      }
                    `}
                  >
                    <label className="flex items-center gap-3 p-3 cursor-pointer">
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
                    {isSelected && (
                      <div className="flex flex-wrap gap-4 px-3 pb-3 pl-10">
                        {(['Service', 'Küche', 'GL'] as const).map((dept) => (
                          <label key={dept} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={depts.has(dept)}
                              onChange={() => toggleDept(restaurant.id, dept)}
                              className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary"
                            />
                            <span className={`text-sm ${depts.has(dept) ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                              {dept}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedRestaurantIds.length === 0 && (
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

          {/* Pool participation toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="staff-pool">Am Trinkgeldpool beteiligt</Label>
              <p className="text-xs text-muted-foreground">Standardwert für neue Abrechnungen</p>
            </div>
            <Switch id="staff-pool" checked={participatesInPool} onCheckedChange={setParticipatesInPool} />
          </div>

          {/* Skills Section - only for existing staff */}
          {staff && <SkillsSection staffId={staff.id} />}

          {/* Payroll Data Section - collapsible */}
          <Separator />
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 group">
              <Label className="text-base font-semibold cursor-pointer">Lohnabrechnungsdaten</Label>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label htmlFor="staff-personr" className="text-xs">Personalnummer</Label>
                <Input id="staff-personr" type="text" inputMode="numeric" value={persoNr} onChange={(e) => setPersoNr(e.target.value)} placeholder="z.B. 1001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pay-hourly-rate" className="text-xs">Stundenlohn (€)</Label>
                  <Input id="pay-hourly-rate" type="text" inputMode="decimal" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="z.B. 14,50" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-tax-class" className="text-xs">Steuerklasse</Label>
                  <Input id="pay-tax-class" value={taxClass} onChange={e => setTaxClass(e.target.value)} placeholder="z.B. I" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-tax-id" className="text-xs">Steuer-ID</Label>
                  <Input id="pay-tax-id" value={taxId} onChange={e => setTaxId(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-sv-nr" className="text-xs">SV-Nr.</Label>
                  <Input id="pay-sv-nr" value={socialSecurityNr} onChange={e => setSocialSecurityNr(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-insurance" className="text-xs">Krankenkasse</Label>
                  <Input id="pay-insurance" value={healthInsurance} onChange={e => setHealthInsurance(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-nationality" className="text-xs">Nationalität</Label>
                  <Input id="pay-nationality" value={nationality} onChange={e => setNationality(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-pers-group" className="text-xs">Personengruppe</Label>
                  <Input id="pay-pers-group" value={personnelGroup} onChange={e => setPersonnelGroup(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-dob" className="text-xs">Geburtsdatum</Label>
                  <Input id="pay-dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-start" className="text-xs">Eintritt</Label>
                  <Input id="pay-start" type="date" value={employmentStart} onChange={e => setEmploymentStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-end" className="text-xs">Austritt</Label>
                  <Input id="pay-end" type="date" value={employmentEnd} onChange={e => setEmploymentEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="pay-minijob" checked={isMinijob} onCheckedChange={setIsMinijob} />
                  <Label htmlFor="pay-minijob" className="text-sm">Minijob</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="pay-sv-exempt" checked={isSvExempt} onCheckedChange={setIsSvExempt} />
                  <Label htmlFor="pay-sv-exempt" className="text-sm">SV-befreit</Label>
                </div>
              </div>
              <Label className="text-base font-semibold">Urlaubsdaten</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="vac-contract" className="text-xs">Vertraglich</Label>
                  <Input id="vac-contract" type="number" inputMode="numeric" value={vacDaysContractual} onChange={e => setVacDaysContractual(e.target.value)} placeholder="Tage" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vac-prev" className="text-xs">Resturlaub Vorjahr</Label>
                  <Input id="vac-prev" type="number" inputMode="numeric" value={vacDaysPrevious} onChange={e => setVacDaysPrevious(e.target.value)} placeholder="Tage" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vac-current" className="text-xs">Aktuelles Jahr</Label>
                  <Input id="vac-current" type="number" inputMode="numeric" value={vacDaysCurrent} onChange={e => setVacDaysCurrent(e.target.value)} placeholder="Tage" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vac-taken" className="text-xs">Genommen</Label>
                  <Input id="vac-taken" type="number" inputMode="numeric" value={vacDaysTaken} onChange={e => setVacDaysTaken(e.target.value)} placeholder="Tage" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sick-total" className="text-xs">Kranktage gesamt</Label>
                  <Input id="sick-total" type="number" inputMode="numeric" value={sickDaysTotal} onChange={e => setSickDaysTotal(e.target.value)} placeholder="Tage" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
            <Button type="submit" disabled={isLoading || !name.trim() || selectedRestaurantIds.length === 0}>
              {isLoading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
