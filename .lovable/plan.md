

## Schichtensumme über alle Restaurants

**Problem:** Die Σ-Spalte in MonthlyGrid zählt nur Schichten des aktuellen Restaurants, da `shifts` bereits nach `restaurant_id` gefiltert ist (Zeile 258).

**Lösung:** Eine zusätzliche Query in `MonthlyGrid.tsx`, die für die angezeigten Mitarbeiter **alle** `shift_assignments` im Zeitraum zählt — unabhängig vom Restaurant.

### Änderung in `src/components/dienstplan/MonthlyGrid.tsx`

1. Neue Query hinzufügen, die alle Schichten der `staffIds` im Zeitraum lädt (ohne `restaurant_id`-Filter), aber nur `staff_id` und `shift_date` selektiert (minimaler Datentransfer):
```ts
const { data: allShifts = [] } = useQuery({
  queryKey: ['all_shift_assignments', department, staffIds, startDate, endDate],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('shift_assignments')
      .select('staff_id')
      .eq('department', department)
      .in('staff_id', staffIds)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate);
    if (error) throw error;
    return data;
  },
  enabled: staffIds.length > 0,
});
```

2. `shiftCount` (Zeile 258) ändern von:
```ts
const shiftCount = shifts.filter(s => s.staff_id === emp.id).length;
```
zu:
```ts
const shiftCount = allShifts.filter(s => s.staff_id === emp.id).length;
```

Eine Datei, zwei kleine Änderungen.

