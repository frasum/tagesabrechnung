import { cn } from '@/lib/utils';
import type { Priority } from '@/hooks/useChecklist';

interface Props {
  value: Priority;
  active: boolean;
  onClick: () => void;
}

const STYLES: Record<Priority, { active: string; inactive: string; label: string }> = {
  green: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    inactive: 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10',
    label: 'Kritisch',
  },
  yellow: {
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10',
    label: 'Wichtig',
  },
  red: {
    active: 'bg-red-500 text-white border-red-500',
    inactive: 'border-red-500/40 text-red-600 hover:bg-red-500/10',
    label: 'Unwichtig',
  },
};

export function PriorityButton({ value, active, onClick }: Props) {
  const s = STYLES[value];
  return (
    <button
      type="button"
      onClick={onClick}
      title={s.label}
      className={cn(
        'h-7 w-7 rounded-full border-2 transition-colors flex items-center justify-center text-xs font-semibold',
        active ? s.active : s.inactive
      )}
    >
      {value === 'green' ? 'K' : value === 'yellow' ? 'W' : 'U'}
    </button>
  );
}
