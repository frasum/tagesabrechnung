import { useState } from 'react';
import { MonthlyGrid } from '@/components/dienstplan/MonthlyGrid';
import { DienstplanToolbar } from '@/components/dienstplan/DienstplanToolbar';


export default function DienstplanService() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  return (
    <div className="space-y-4">
      <DienstplanToolbar month={month} year={year} department="service" onMonthChange={(m, y) => { setMonth(m); setYear(y); }} />
      <MonthlyGrid department="service" month={month} year={year} />
      
    </div>
  );
}
