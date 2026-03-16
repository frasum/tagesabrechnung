import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShiftEditPopover } from './ShiftEditPopover';
import type { ShiftAssignment } from '@/hooks/useDienstplan';
import type { Skill } from '@/hooks/useSkills';
import { cn } from '@/lib/utils';

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
}

function formatTime(t: string | null) {
  if (!t) return '';
  return t.substring(0, 5);
}

export function ShiftCell({
  shift,
  absenceType,
  staffId,
  date,
  department,
  restaurantId,
  skills,
  employeeSkillIds,
  onAbsence,
}: ShiftCellProps) {
  const [open, setOpen] = useState(false);

  const assignedSkill = shift?.assigned_skill_id
    ? skills.find(s => s.id === shift.assigned_skill_id)
    : null;

  if (absenceType && !shift) {
    const isVacation = absenceType === 'vacation';
    return (
      <td
        className={cn(
          'text-center text-xs font-semibold p-1 min-w-[52px] cursor-pointer border border-border/50',
          isVacation ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        )}
      >
        {isVacation ? 'U' : 'K'}
      </td>
    );
  }

  return (
    <td className="p-0 min-w-[52px] border border-border/50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-full h-full min-h-[40px] text-xs flex flex-col items-center justify-center gap-0.5 transition-colors',
              shift
                ? 'hover:opacity-80'
                : 'hover:bg-muted/50 text-muted-foreground'
            )}
            style={assignedSkill ? { backgroundColor: assignedSkill.color + '20' } : undefined}
          >
            {shift ? (
              <>
                {assignedSkill && (
                  <span
                    className="text-[10px] font-bold text-white px-1 rounded"
                    style={{ backgroundColor: assignedSkill.color }}
                  >
                    {assignedSkill.name}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/40">+</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <ShiftEditPopover
            shift={shift}
            staffId={staffId}
            date={date}
            department={department}
            restaurantId={restaurantId}
            skills={skills}
            employeeSkillIds={employeeSkillIds}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </td>
  );
}
