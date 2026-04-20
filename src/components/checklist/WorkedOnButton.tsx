import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  active: boolean;
  onClick: () => void;
}

export function WorkedOnButton({ active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Bearbeitet"
      className={cn(
        'h-7 w-7 rounded-full border-2 transition-colors flex items-center justify-center',
        active
          ? 'bg-blue-500 text-white border-blue-500'
          : 'border-blue-500/40 text-blue-600 hover:bg-blue-500/10'
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}
