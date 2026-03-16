import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpsertShift, useDeleteShift, type ShiftAssignment } from '@/hooks/useDienstplan';
import type { Skill } from '@/hooks/useSkills';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShiftEditPopoverProps {
  shift?: ShiftAssignment;
  staffId: string;
  date: string;
  department: 'kitchen' | 'service';
  restaurantId: string;
  skills: Skill[];
  employeeSkillIds: string[];
  onClose: () => void;
}

export function ShiftEditPopover({
  shift,
  staffId,
  date,
  department,
  restaurantId,
  skills,
  employeeSkillIds,
  onClose,
}: ShiftEditPopoverProps) {
  const [startTime, setStartTime] = useState(shift?.start_time?.substring(0, 5) || '16:00');
  const [endTime, setEndTime] = useState(shift?.end_time?.substring(0, 5) || '23:00');
  const [skillId, setSkillId] = useState<string>(shift?.assigned_skill_id || 'none');

  const upsertShift = useUpsertShift();
  const deleteShift = useDeleteShift();

  const availableSkills = skills.filter(s => employeeSkillIds.includes(s.id));

  const handleSave = () => {
    upsertShift.mutate(
      {
        id: shift?.id,
        staff_id: staffId,
        restaurant_id: restaurantId,
        department,
        shift_date: date,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        assigned_skill_id: skillId === 'none' ? null : skillId,
        notes: shift?.notes || null,
      },
      {
        onSuccess: () => {
          toast.success('Schicht gespeichert');
          onClose();
        },
        onError: () => toast.error('Fehler beim Speichern'),
      }
    );
  };

  const handleDelete = () => {
    if (!shift?.id) return;
    deleteShift.mutate(shift.id, {
      onSuccess: () => {
        toast.success('Schicht gelöscht');
        onClose();
      },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{date}</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Von</Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Bis</Label>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      {availableSkills.length > 0 && (
        <div>
          <Label className="text-xs">Skill / Posten</Label>
          <Select value={skillId} onValueChange={setSkillId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Kein Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Skill</SelectItem>
              {availableSkills.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={upsertShift.isPending} className="flex-1">
          Speichern
        </Button>
        {shift && (
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteShift.isPending}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
