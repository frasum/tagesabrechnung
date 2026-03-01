

## Fix: Leere Schichten sollen keinen Konflikt auslösen

### Problem
Die `getConflict`-Funktion in `ZtWochenplan.tsx` prüft nur `week_id`, aber nicht ob die gefundene Schicht tatsächlich Daten enthält. Leere Einträge (ohne `start_time`/`end_time`, 0 Stunden) blockieren fälschlicherweise die Bearbeitung.

### Lösung
Die Konfliktprüfung erweitern: Nur Schichten mit tatsächlichen Zeiten oder Abwesenheitstyp als Konflikt werten.

### Änderungen

**1. `src/pages/zeiterfassung/ZtWochenplan.tsx`**

- `globalShifts`-Query: Zusätzlich `start_time`, `end_time`, `total_hours`, `absence_type` laden
- `getConflict`: Nur matchen wenn die fremde Schicht nicht leer ist (`start_time` vorhanden ODER `absence_type` vorhanden ODER `total_hours > 0`)
- `upsertShift`-Validierung: Gleiche Bedingung anwenden

```typescript
// Conflict nur wenn die fremde Schicht tatsächlich Daten hat
const getConflict = (empId, date, dept) => {
  return globalShifts?.find(s =>
    s.employee_id === empId &&
    s.shift_date === date &&
    s.week_id !== selectedWeekId &&
    (s.start_time || s.absence_type || s.total_hours > 0)
  ) ?? null;
};
```

**2. `src/lib/syncWaiterToZt.ts`** und **`src/components/zeiterfassung/ShiftTimeOverride.tsx`**
- Gleiche Bedingung: Leere Schichten in anderen Restaurants nicht als Konflikt werten

### Ergebnis
Chefin kann am 26.2. und 28.2. in der Spicery bearbeitet werden, da die YUM-Einträge leer sind. Sobald in YUM tatsächlich Zeiten eingetragen werden, greift der Konflikt wieder.

