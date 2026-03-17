import { useState } from 'react';
import { MonthlyGrid } from '@/components/dienstplan/MonthlyGrid';
import { DienstplanToolbar } from '@/components/dienstplan/DienstplanToolbar';
import { DienstplanPaintToolbar, type PaintModeState } from '@/components/dienstplan/DienstplanPaintToolbar';

export default function DienstplanKueche() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [paintMode, setPaintMode] = useState<PaintModeState>({ activeSkillId: null, deleteMode: false, absencePaintType: null });

  return (
    <div className="space-y-4">
      <DienstplanToolbar month={month} year={year} department="kitchen" onMonthChange={(m, y) => { setMonth(m); setYear(y); }} />
      <DienstplanPaintToolbar
        department="kitchen"
        activeSkillId={paintMode.activeSkillId}
        deleteMode={paintMode.deleteMode}
        absencePaintType={paintMode.absencePaintType}
        onModeChange={setPaintMode}
      />
      <MonthlyGrid
        department="kitchen"
        month={month}
        year={year}
        activeSkillId={paintMode.activeSkillId}
        deleteMode={paintMode.deleteMode}
        paintAbsenceType={paintMode.absencePaintType}
      />
    </div>
  );
}
