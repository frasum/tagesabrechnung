import { useState, forwardRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpsertShift, useDeleteShift, type ShiftAssignment } from '@/hooks/useDienstplan';
import type { Skill } from '@/hooks/useSkills';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { X, Cake } from 'lucide-react';

interface ShiftCellProps {
  shift?: ShiftAssignment;
  absenceType?: string | null;
  staffId: string;
  date: string;
  department: 'kitchen' | 'service';
  restaurantId: string;
  skills: Skill[];
  employeeSkillIds: string[];
  onAbsence?: () => void;
  isFocused?: boolean;
  isToday?: boolean;
  conflictRestaurant?: string;
  isBirthday?: boolean;
}

export const ShiftCell = forwardRef<HTMLTableCellElement, ShiftCellProps>(({
  shift,
  absenceType,
  staffId,
  date,
  department,
  restaurantId,
  skills,
  employeeSkillIds,
  onAbsence,
  isFocused,
  isToday,
  conflictRestaurant,
  isBirthday,
}, ref) => {
  const [open, setOpen] = useState(false);
  const upsertShift = useUpsertShift();
  const deleteShift = useDeleteShift();

  const assignedSkill = shift?.assigned_skill_id
    ? skills.find(s => s.id === shift.assigned_skill_id)
    : null;

  const availableSkills = skills.filter(s =>
    employeeSkillIds.includes(s.id) &&
    (department === 'kitchen'
      ? s.category === 'kitchen'
      : s.category === 'service' || s.category === 'gl')
  );

  const focusRing = isFocused ? 'ring-2 ring-primary ring-inset' : '';
  const todayBg = isToday ? 'bg-primary/5' : '';
  const conflictStyle = conflictRestaurant ? 'border-l-2 border-l-amber-500' : '';
  const conflictTitle = conflictRestaurant ? `Bereits eingeteilt bei ${conflictRestaurant}` : undefined;

  // Absence cell
  if (absenceType && !shift) {
    const isVacation = absenceType === 'vacation';
    return (
      <td
        ref={ref}
        onClick={onAbsence}
        title={conflictTitle}
        className={cn(
          'text-center text-xs font-semibold p-1 min-w-[52px] cursor-pointer border border-border/50 relative',
          isVacation ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800',
          focusRing, conflictStyle
        )}
      >
        {isVacation ? 'U' : 'K'}
        {isBirthday && <Cake className="absolute bottom-0.5 left-0.5 w-3 h-3 text-pink-500" />}
        {conflictRestaurant && <span className="absolute top-0 right-0.5 text-[8px] text-amber-600">⚠</span>}
      </td>
    );
  }

  const handleSkillSelect = (skillId: string | null) => {
    // Block new assignment if already scheduled at another restaurant
    if (!shift && conflictRestaurant) {
      toast.error(`Bereits eingeteilt bei ${conflictRestaurant}`);
      setOpen(false);
      return;
    }
    setOpen(false);
    upsertShift.mutate(
      {
        id: shift?.id,
        staff_id: staffId,
        restaurant_id: restaurantId,
        department,
        shift_date: date,
        start_time: null,
        end_time: null,
        assigned_skill_id: skillId,
        notes: shift?.notes || null,
      },
      {
        onError: () => toast.error('Fehler beim Speichern'),
      }
    );
  };

  const handleDelete = () => {
    if (!shift?.id) return;
    setOpen(false);
    deleteShift.mutate(shift.id);
  };

  // No skills assigned → simple toggle
  if (availableSkills.length === 0) {
    return (
      <td ref={ref} title={conflictTitle} className={cn('p-0 min-w-[52px] border border-border/50 relative', todayBg, focusRing, conflictStyle)}>
        <button
          className={cn(
            'w-full h-full min-h-[36px] text-xs flex items-center justify-center transition-colors',
            shift
              ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20'
              : 'hover:bg-muted/50 text-muted-foreground/40'
          )}
          tabIndex={-1}
          onClick={() => {
            if (shift) {
              handleDelete();
            } else {
              handleSkillSelect(null);
            }
          }}
        >
          {shift ? '✓' : '+'}
        </button>
        {isBirthday && <Cake className="absolute bottom-0.5 left-0.5 w-3 h-3 text-pink-500" />}
        {conflictRestaurant && <span className="absolute top-0 right-0.5 text-[8px] text-amber-600">⚠</span>}
      </td>
    );
  }

  // Exactly one skill → direct toggle without popover
  if (availableSkills.length === 1) {
    const singleSkill = availableSkills[0];
    return (
      <td ref={ref} title={conflictTitle} className={cn('p-0 min-w-[52px] border border-border/50 relative', todayBg, focusRing, conflictStyle)}>
        <button
          className={cn(
            'w-full h-full min-h-[36px] text-xs flex items-center justify-center transition-colors'
          )}
          tabIndex={-1}
          style={shift ? { backgroundColor: singleSkill.color + '20' } : undefined}
          onClick={() => {
            if (shift) {
              handleDelete();
            } else {
              handleSkillSelect(singleSkill.id);
            }
          }}
        >
          {shift ? (
            <span
              className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
              style={{ backgroundColor: singleSkill.color }}
            >
              {singleSkill.name}
            </span>
          ) : (
            <span className="text-muted-foreground/40">+</span>
          )}
        </button>
        {isBirthday && <Cake className="absolute bottom-0.5 left-0.5 w-3 h-3 text-pink-500" />}
        {conflictRestaurant && <span className="absolute top-0 right-0.5 text-[8px] text-amber-600">⚠</span>}
      </td>
    );
  }

  return (
    <td ref={ref} title={conflictTitle} className={cn('p-0 min-w-[52px] border border-border/50 relative', todayBg, focusRing, conflictStyle)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-full h-full min-h-[36px] text-xs flex items-center justify-center transition-colors'
            )}
            tabIndex={-1}
            style={assignedSkill ? { backgroundColor: assignedSkill.color + '20' } : undefined}
          >
            {assignedSkill ? (
              <span
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                style={{ backgroundColor: assignedSkill.color }}
              >
                {assignedSkill.name}
              </span>
            ) : (
              <span className="text-muted-foreground/40">+</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto min-w-[120px] p-1.5" align="start">
          <div className="flex flex-col gap-1">
            {availableSkills.map(s => (
              <button
                key={s.id}
                onClick={() => handleSkillSelect(s.id)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors text-left',
                  shift?.assigned_skill_id === s.id
                    ? 'ring-2 ring-offset-1 ring-primary/50'
                    : 'hover:bg-muted'
                )}
                style={
                  shift?.assigned_skill_id === s.id
                    ? { backgroundColor: s.color + '20' }
                    : undefined
                }
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </button>
            ))}
            {shift && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3 h-3" />
                Frei
              </button>
            )}
            {onAbsence && (
              <button
                onClick={() => { setOpen(false); onAbsence(); }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted transition-colors border-t border-border/50 mt-0.5 pt-1.5"
              >
                Abwesenheit
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {isBirthday && <Cake className="absolute bottom-0.5 left-0.5 w-3 h-3 text-pink-500" />}
      {conflictRestaurant && <span className="absolute top-0 right-0.5 text-[8px] text-amber-600">⚠</span>}
    </td>
  );
});

ShiftCell.displayName = 'ShiftCell';
