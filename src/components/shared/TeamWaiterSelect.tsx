import { useActiveStaff, useActiveStaffByRestaurant } from '@/hooks/useStaff';
import { User, Users, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TeamWaiterSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  excludeWaiter?: string;
  disabled?: boolean;
  restaurantId?: string | null;
}

export function TeamWaiterSelect({
  value,
  onValueChange,
  excludeWaiter = '',
  disabled = false,
  restaurantId,
}: TeamWaiterSelectProps) {
  const globalQuery = useActiveStaff(restaurantId ? undefined : 'waiter');
  const restaurantQuery = useActiveStaffByRestaurant(restaurantId ?? null, 'waiter');
  const { data: staffList = [], isLoading } = restaurantId ? restaurantQuery : globalQuery;

  // Filter out the primary waiter and already selected waiters from dropdown
  const availableStaff = staffList.filter(
    (staff) => staff.name !== excludeWaiter && !value.includes(staff.name)
  );

  const handleAdd = (name: string) => {
    if (name && name !== 'placeholder') {
      onValueChange([...value, name]);
    }
  };

  const handleRemove = (name: string) => {
    onValueChange(value.filter((n) => n !== name));
  };

  return (
    <div className="space-y-2">
      {/* Selected team members */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              <User className="w-3 h-3" />
              {name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(name)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add more dropdown */}
      {availableStaff.length > 0 && !disabled && (
        <Select value="placeholder" onValueChange={handleAdd} disabled={disabled || isLoading}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isLoading ? 'Laden...' : 'Kollegen hinzufügen...'}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.name}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {staff.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
