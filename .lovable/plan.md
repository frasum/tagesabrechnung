

# Fix: Restaurant-Filter-Wechsel soll ebenfalls W1/aktuelle Woche auswählen

## Problem
Beim Klick auf YUM, Spicery oder Alle im Restaurant-Filter passiert kein Wochen-Reset. Der Nutzer möchte dasselbe Verhalten wie beim Monatswechsel: W1 öffnen, außer es ist der aktuelle Abrechnungsmonat — dann die aktuelle Woche.

## Lösung

### `src/pages/zeiterfassung/ZtWochenplan.tsx` (Zeile ~632)

Die `onRestaurantFilterChange`-Callback um die gleiche Wochen-Logik erweitern:

```tsx
onRestaurantFilterChange={(v) => {
  setRestaurantFilter(v);
  setCumSelectedWeekNum(null);
  
  // Same W1/current-week logic as period change
  const today = format(new Date(), "yyyy-MM-dd");
  const isCurrentPeriod = selectedPeriod && selectedPeriod.start_date <= today && selectedPeriod.end_date >= today;
  
  if (isCurrentPeriod && weeks?.length) {
    const currentWeek = weeks.find(w => w.start_date <= today && w.end_date >= today);
    setSelectedWeekId(currentWeek?.id ?? weeks[0]?.id ?? "");
  } else if (weeks?.length) {
    setSelectedWeekId(weeks[0]?.id ?? "");
  }
}}
```

Einzige Datei betroffen. `format` aus `date-fns` ist bereits importiert.

