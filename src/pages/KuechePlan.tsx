import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyGrid } from '@/components/dienstplan/MonthlyGrid';
import { useSkills } from '@/hooks/useSkills';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, X, Palmtree, Thermometer } from 'lucide-react';
import { getPeriodRange } from '@/lib/periodUtils';

const monthNames = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatPeriodLabel(month0: number, year: number) {
  const { start, end } = getPeriodRange(month0 + 1, year);
  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
  return `${monthNames[month0]} ${year} (${fmt(start)}–${fmt(end)}${end.getFullYear()})`;
}

export default function KuechePlan() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [absencePaintType, setAbsencePaintType] = useState<'vacation' | 'sick' | null>(null);

  const { data: skills = [] } = useSkills();
  const kitchenSkills = useMemo(() => skills.filter(s => s.category === 'kitchen'), [skills]);

  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants-kueche-plan'],
    queryFn: async () => {
      const { data, error } = await supabase.from('restaurants').select('id, name, slug').order('name');
      if (error) throw error;
      return data;
    },
  });

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleSkillToggle = (value: string) => {
    if (value === '__delete') {
      setDeleteMode(true);
      setActiveSkillId(null);
      setAbsencePaintType(null);
    } else if (value === '__vacation') {
      setAbsencePaintType('vacation');
      setActiveSkillId(null);
      setDeleteMode(false);
    } else if (value === '__sick') {
      setAbsencePaintType('sick');
      setActiveSkillId(null);
      setDeleteMode(false);
    } else if (value) {
      setDeleteMode(false);
      setActiveSkillId(value);
      setAbsencePaintType(null);
    } else {
      setDeleteMode(false);
      setActiveSkillId(null);
      setAbsencePaintType(null);
    }
  };

  const toggleValue = deleteMode ? '__delete' : absencePaintType === 'vacation' ? '__vacation' : absencePaintType === 'sick' ? '__sick' : (activeSkillId || '');

  return (
    <GlobalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background pb-3 border-b border-border/50 shadow-sm">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Küchenplan</h1>
            
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[220px] text-center">
                {formatPeriodLabel(month, year)}
              </span>
              <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              {/* Skill paint buttons */}
              <ToggleGroup
                type="single"
                value={toggleValue}
                onValueChange={handleSkillToggle}
                className="gap-1"
              >
                {kitchenSkills.map(skill => (
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

              {(activeSkillId || deleteMode || absencePaintType) && (
                <span className="text-xs text-muted-foreground ml-2">
                  Klick = {deleteMode ? 'Schicht löschen' : absencePaintType ? 'Abwesenheit eintragen' : 'Skill zuweisen / entfernen'}
                </span>
              )}
            </div>

            {/* Active mode indicator bar */}
            {(activeSkillId || deleteMode || absencePaintType) && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: deleteMode
                      ? 'hsl(var(--destructive))'
                      : absencePaintType === 'vacation'
                      ? '#f59e0b'
                      : absencePaintType === 'sick'
                      ? '#ef4444'
                      : kitchenSkills.find(s => s.id === activeSkillId)?.color,
                  }}
                />
                <span
                  className="text-xs font-medium whitespace-nowrap transition-colors duration-300"
                  style={{
                    color: deleteMode
                      ? 'hsl(var(--destructive))'
                      : absencePaintType === 'vacation'
                      ? '#f59e0b'
                      : absencePaintType === 'sick'
                      ? '#ef4444'
                      : kitchenSkills.find(s => s.id === activeSkillId)?.color,
                  }}
                >
                  {deleteMode ? 'Löschmodus' : absencePaintType === 'vacation' ? 'Urlaub' : absencePaintType === 'sick' ? 'Krank' : kitchenSkills.find(s => s.id === activeSkillId)?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Restaurant grids */}
        {restaurants.map(restaurant => (
          <div key={restaurant.id} className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground border-l-4 border-primary pl-3">
              {restaurant.name}
            </h2>
            <MonthlyGrid
              department="kitchen"
              month={month}
              year={year}
              restaurantIdOverride={restaurant.id}
              activeSkillId={activeSkillId}
              deleteMode={deleteMode}
              paintAbsenceType={absencePaintType}
            />
          </div>
        ))}
      </div>
    </GlobalLayout>
  );
}
