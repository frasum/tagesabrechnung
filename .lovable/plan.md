

# Fix: Monatswechsel — W1 oder aktuelle Woche

## Verhalten
- Manueller Periodenwechsel → **immer W1 öffnen**
- **Ausnahme**: Wenn die gewählte Periode den heutigen Tag enthält → die **aktuelle Woche** öffnen

## Änderung

### `src/contexts/ZtContext.tsx` — `handleSetPeriodId` (Zeile ~128–135)

```tsx
const handleSetPeriodId = (id: string) => {
  setSelectedPeriodId(id);
  const periodWeeks = allWeeks?.filter(w => w.period_id === id) ?? [];
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedPeriod = periods?.find(p => p.id === id);
  const isCurrentPeriod = selectedPeriod && selectedPeriod.start_date <= today && selectedPeriod.end_date >= today;
  
  if (isCurrentPeriod) {
    const currentWeek = periodWeeks.find(w => w.start_date <= today && w.end_date >= today);
    setSelectedWeekId(currentWeek?.id ?? periodWeeks[0]?.id ?? "");
  } else {
    setSelectedWeekId(periodWeeks[0]?.id ?? "");
  }
};
```

Einzige Datei betroffen. Keine anderen Änderungen nötig.

