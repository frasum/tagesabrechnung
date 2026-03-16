import { useSkills } from '@/hooks/useSkills';
import { SkillBadge } from './SkillBadge';

interface DienstplanLegendProps {
  category: 'kitchen' | 'service';
}

export function DienstplanLegend({ category }: DienstplanLegendProps) {
  const { data: skills = [] } = useSkills();
  const filtered = skills.filter(s =>
    category === 'kitchen'
      ? s.category === 'kitchen'
      : s.category === 'service' || s.category === 'gl'
  );

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <span className="font-medium">Legende:</span>
      {filtered.map(s => (
        <SkillBadge key={s.id} skill={s} size="md" />
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300" /> Urlaub
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-4 h-4 rounded bg-red-100 border border-red-300" /> Krank
      </span>
    </div>
  );
}
