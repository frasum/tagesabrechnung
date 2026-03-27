

# Fix: Abteilungsübergreifende Konflikterkennung im Wochenplan (Zeiterfassung)

## Problem
Die `getConflict`-Funktion in `ZtWochenplan.tsx` prüft nur `s.week_id !== selectedWeekId`. Da Schichten im selben Restaurant aber anderer Abteilung dieselbe `week_id` haben, werden sie nie als Konflikt erkannt. Coco ist z.B. im Service eingetragen, aber in der Küche fehlt der Konflikthinweis.

## Lösung

### Datei: `src/pages/zeiterfassung/ZtWochenplan.tsx`

Die `getConflict`-Funktion erweitern, um **auch** Schichten mit gleicher `week_id` aber **anderer Abteilung** als Konflikt zu erkennen:

```typescript
const getConflict = useCallback(
  (empId: string, date: string, dept: string) => {
    if (cumulated) return null;
    return globalShifts?.find(s =>
      s.employee_id === empId &&
      s.shift_date === date &&
      (s.start_time || s.absence_type || (s.total_hours ?? 0) > 0) &&
      (
        s.week_id !== selectedWeekId ||          // anderes Restaurant
        (s.department || '') !== (dept || '')     // gleiche week_id, andere Abteilung
      )
    ) ?? null;
  },
  [globalShifts, selectedWeekId, cumulated]
);
```

Dadurch wird Coco in der Küche-Ansicht mit dem bestehenden Amber-Hinweis "Bereits in Service eingetragen" markiert und das Eintragen blockiert — genau wie bei restaurantübergreifenden Konflikten.

Keine weiteren Dateien müssen geändert werden, da die HoverCard-Anzeige bereits `conflict.department` auswertet.

