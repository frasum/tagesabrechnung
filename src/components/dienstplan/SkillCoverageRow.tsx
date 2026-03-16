import type { ShiftAssignment } from '@/hooks/useDienstplan';
import type { Skill } from '@/hooks/useSkills';

interface SkillCoverageRowProps {
  dates: string[];
  shifts: ShiftAssignment[];
  skills: Skill[];
  category: 'kitchen' | 'service';
}

export function SkillCoverageRow({ dates, shifts, skills, category }: SkillCoverageRowProps) {
  const relevantSkills = skills.filter(s =>
    category === 'kitchen' ? s.category === 'kitchen' : s.category === 'service' || s.category === 'gl'
  );

  return (
    <tr className="border-t-2 border-border">
      <td className="p-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-background">
        Besetzung
      </td>
      {dates.map(date => {
        const dayShifts = shifts.filter(s => s.shift_date === date && s.assigned_skill_id);
        const coverage = relevantSkills
          .map(skill => ({
            skill,
            count: dayShifts.filter(s => s.assigned_skill_id === skill.id).length,
          }))
          .filter(c => c.count > 0);

        return (
          <td key={date} className="p-1 text-[10px] min-w-[52px] border border-border/50 align-top">
            {coverage.map(c => (
              <div key={c.skill.id} className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.skill.color }} />
                <span>{c.skill.name}:{c.count}</span>
              </div>
            ))}
          </td>
        );
      })}
      <td className="border border-border/50" />
    </tr>
  );
}
