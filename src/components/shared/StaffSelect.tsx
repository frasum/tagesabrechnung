import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveStaff, useActiveStaffByRestaurant, StaffRole } from '@/hooks/useStaff';
import { User, ChefHat, Users } from 'lucide-react';

export type StaffSelectRole = StaffRole | 'all';

interface StaffSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  role: StaffSelectRole;
  placeholder?: string;
  disabled?: boolean;
  excludeNames?: string[];
  restaurantId?: string | null;
}

export function StaffSelect({ 
  value, 
  onValueChange, 
  role, 
  placeholder = 'Mitarbeiter wählen',
  disabled = false,
  excludeNames = [],
  restaurantId,
}: StaffSelectProps) {
  const resolvedRole = role === 'all' ? undefined : role;
  const globalQuery = useActiveStaff(restaurantId ? undefined : resolvedRole);
  const restaurantQuery = useActiveStaffByRestaurant(restaurantId ?? null, resolvedRole);
  const { data: staffList = [], isLoading } = restaurantId ? restaurantQuery : globalQuery;
  const filteredStaff = excludeNames.length > 0
    ? staffList.filter((s) => !excludeNames.includes(s.name))
    : staffList;
  
  const Icon = role === 'all' ? Users : role === 'kitchen' ? ChefHat : User;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder={isLoading ? 'Laden...' : placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {filteredStaff.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Keine aktiven {role === 'kitchen' ? 'Küchenmitarbeiter' : 'Mitarbeiter'} vorhanden.
            <br />
            <span className="text-xs">Bitte in der Mitarbeiterverwaltung hinzufügen.</span>
          </div>
        ) : (
          filteredStaff.map((staff) => (
            <SelectItem key={staff.id} value={staff.name}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {staff.name}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
