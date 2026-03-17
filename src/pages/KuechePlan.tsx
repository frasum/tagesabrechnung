import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyGrid } from '@/components/dienstplan/MonthlyGrid';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPeriodRange } from '@/lib/periodUtils';
import { DienstplanPaintToolbar, type PaintModeState } from '@/components/dienstplan/DienstplanPaintToolbar';

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
  const [paintMode, setPaintMode] = useState<PaintModeState>({ activeSkillId: null, deleteMode: false, absencePaintType: null });

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

  return (
    <GlobalLayout>
      <div className="space-y-6">
        <div className="sticky top-0 z-20 bg-background pb-3 border-b border-border/50 shadow-sm">
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Küchenplan</h1>

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

              <DienstplanPaintToolbar
                department="kitchen"
                activeSkillId={paintMode.activeSkillId}
                deleteMode={paintMode.deleteMode}
                absencePaintType={paintMode.absencePaintType}
                onModeChange={setPaintMode}
              />
            </div>
          </div>
        </div>

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
              activeSkillId={paintMode.activeSkillId}
              deleteMode={paintMode.deleteMode}
              paintAbsenceType={paintMode.absencePaintType}
            />
          </div>
        ))}
      </div>
    </GlobalLayout>
  );
}
