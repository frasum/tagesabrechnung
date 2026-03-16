import type { Skill } from '@/hooks/useSkills';

interface SkillBadgeProps {
  skill: Skill;
  size?: 'sm' | 'md';
}

export function SkillBadge({ skill, size = 'sm' }: SkillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ backgroundColor: skill.color }}
    >
      {skill.name}
    </span>
  );
}
