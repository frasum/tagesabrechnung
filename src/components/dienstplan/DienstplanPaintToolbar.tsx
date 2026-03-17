import { useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { X, Palmtree, Thermometer } from 'lucide-react';
import { useSkills } from '@/hooks/useSkills';

export interface PaintModeState {
  activeSkillId: string | null;
  deleteMode: boolean;
  absencePaintType: 'vacation' | 'sick' | null;
}

interface DienstplanPaintToolbarProps {
  department: 'kitchen' | 'service';
  activeSkillId: string | null;
  deleteMode: boolean;
  absencePaintType: 'vacation' | 'sick' | null;
  onModeChange: (state: PaintModeState) => void;
}

export function DienstplanPaintToolbar({
  department,
  activeSkillId,
  deleteMode,
  absencePaintType,
  onModeChange,
}: DienstplanPaintToolbarProps) {
  const { data: skills = [] } = useSkills();
  const filteredSkills = useMemo(
    () => skills.filter(s => department === 'kitchen' ? s.category === 'kitchen' : (s.category === 'service' || s.category === 'gl')),
    [skills, department],
  );

  const toggleValue = deleteMode
    ? '__delete'
    : absencePaintType === 'vacation'
    ? '__vacation'
    : absencePaintType === 'sick'
    ? '__sick'
    : (activeSkillId || '');

  const handleToggle = (value: string) => {
    if (value === '__delete') {
      onModeChange({ activeSkillId: null, deleteMode: true, absencePaintType: null });
    } else if (value === '__vacation') {
      onModeChange({ activeSkillId: null, deleteMode: false, absencePaintType: 'vacation' });
    } else if (value === '__sick') {
      onModeChange({ activeSkillId: null, deleteMode: false, absencePaintType: 'sick' });
    } else if (value) {
      onModeChange({ activeSkillId: value, deleteMode: false, absencePaintType: null });
    } else {
      onModeChange({ activeSkillId: null, deleteMode: false, absencePaintType: null });
    }
  };

  const isActive = !!(activeSkillId || deleteMode || absencePaintType);

  const activeColor = deleteMode
    ? 'hsl(var(--destructive))'
    : absencePaintType === 'vacation'
    ? '#f59e0b'
    : absencePaintType === 'sick'
    ? '#ef4444'
    : filteredSkills.find(s => s.id === activeSkillId)?.color;

  const activeLabel = deleteMode
    ? 'Löschmodus'
    : absencePaintType === 'vacation'
    ? 'Urlaub'
    : absencePaintType === 'sick'
    ? 'Krank'
    : filteredSkills.find(s => s.id === activeSkillId)?.name;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 flex-wrap">
        <ToggleGroup type="single" value={toggleValue} onValueChange={handleToggle} className="gap-1">
          {filteredSkills.map(skill => (
            <ToggleGroupItem
              key={skill.id}
              value={skill.id}
              className="h-8 px-3 text-xs font-bold rounded-full border data-[state=on]:text-white transition-colors"
              style={{
                borderColor: skill.color,
                ...(toggleValue === skill.id
                  ? { backgroundColor: skill.color, color: 'white' }
                  : { color: skill.color }),
              }}
            >
              {skill.name}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem
            value="__delete"
            className="h-8 px-3 text-xs font-bold rounded-full border border-destructive data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Löschen
          </ToggleGroupItem>

          <div className="h-6 w-px bg-border mx-1" />

          <ToggleGroupItem
            value="__vacation"
            className="h-8 px-3 text-xs font-bold rounded-full border border-amber-500 data-[state=on]:bg-amber-500 data-[state=on]:text-white text-amber-600 transition-colors"
          >
            <Palmtree className="w-3.5 h-3.5 mr-1" />
            Urlaub
          </ToggleGroupItem>
          <ToggleGroupItem
            value="__sick"
            className="h-8 px-3 text-xs font-bold rounded-full border border-red-500 data-[state=on]:bg-red-500 data-[state=on]:text-white text-red-600 transition-colors"
          >
            <Thermometer className="w-3.5 h-3.5 mr-1" />
            Krank
          </ToggleGroupItem>
        </ToggleGroup>

        {isActive && (
          <span className="text-xs text-muted-foreground ml-2">
            Klick = {deleteMode ? 'Schicht löschen' : absencePaintType ? 'Abwesenheit eintragen' : 'Skill zuweisen / entfernen'}
          </span>
        )}
      </div>

      {isActive && (
        <div className="flex items-center gap-2">
          <div
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: activeColor }}
          />
          <span
            className="text-xs font-medium whitespace-nowrap transition-colors duration-300"
            style={{ color: activeColor }}
          >
            {activeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
