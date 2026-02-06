import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveStaff, StaffRole } from '@/hooks/useStaff';
import { User, ChefHat } from 'lucide-react';

interface StaffSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  role: StaffRole;
  placeholder?: string;
  disabled?: boolean;
}

export function StaffSelect({ 
  value, 
  onValueChange, 
  role, 
  placeholder = 'Mitarbeiter wählen',
  disabled = false 
}: StaffSelectProps) {
  const { data: staffList = [], isLoading } = useActiveStaff(role);
  
  const Icon = role === 'kitchen' ? ChefHat : User;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder={isLoading ? 'Laden...' : placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {staffList.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Keine aktiven {role === 'kitchen' ? 'Küchenmitarbeiter' : 'Kellner'} vorhanden.
            <br />
            <span className="text-xs">Bitte in der Mitarbeiterverwaltung hinzufügen.</span>
          </div>
        ) : (
          staffList.map((staff) => (
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
