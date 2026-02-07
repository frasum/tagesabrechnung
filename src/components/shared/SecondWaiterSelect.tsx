import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveStaff } from '@/hooks/useStaff';
import { User, Users } from 'lucide-react';

interface SecondWaiterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  excludeWaiter?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SecondWaiterSelect({ 
  value, 
  onValueChange, 
  excludeWaiter = '',
  placeholder = 'Keiner',
  disabled = false 
}: SecondWaiterSelectProps) {
  const { data: staffList = [], isLoading } = useActiveStaff('waiter');
  
  // Filter out the primary waiter from the list
  const filteredStaff = staffList.filter(staff => staff.name !== excludeWaiter);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder={isLoading ? 'Laden...' : placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Keiner (Einzelschicht)
          </div>
        </SelectItem>
        {filteredStaff.map((staff) => (
          <SelectItem key={staff.id} value={staff.name}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {staff.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
