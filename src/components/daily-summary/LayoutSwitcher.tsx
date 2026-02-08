import { LayoutList, LayoutGrid, Columns2, Table } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type LayoutMode = 'horizontal' | 'sections' | 'columns' | 'table';

interface LayoutSwitcherProps {
  value: LayoutMode;
  onChange: (value: LayoutMode) => void;
}

const layoutOptions = [
  { value: 'horizontal' as const, icon: LayoutList, label: 'Horizontal gestapelt' },
  { value: 'sections' as const, icon: LayoutGrid, label: 'Gruppierte Sektionen' },
  { value: 'columns' as const, icon: Columns2, label: 'Zwei-Spalten' },
  { value: 'table' as const, icon: Table, label: 'Kompakte Tabelle' },
];

export function LayoutSwitcher({ value, onChange }: LayoutSwitcherProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(val) => val && onChange(val as LayoutMode)}
        className="bg-muted/50 rounded-lg p-1"
      >
        {layoutOptions.map(({ value: optValue, icon: Icon, label }) => (
          <Tooltip key={optValue}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={optValue}
                aria-label={label}
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2.5"
              >
                <Icon className="w-4 h-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
