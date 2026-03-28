

# Fix: Kumulierte Mitarbeiter-Anzeige im Lohnportal (SharedZtView)

## Problem
Im Lohnbüro-Portal erscheint Appel bei "Alle" zweimal (einmal mit 14 Schichten/YUM, einmal mit 2 Schichten/Spicery), statt einmal konsolidiert mit 16 Schichten. Der `exportShifts`-Filter in `ZusammenfassungTab` schließt Schichten aus, deren Restaurant nicht zur `restaurant_id` des (deduplizierten) Mitarbeiters passt.

## Ursache
`exportShifts` (Zeile 709–719) filtert Schichten anhand `empRest === restId` — aber bei deduplizierten Mitarbeitern (eine Zeile pro id+department) wird nur die `restaurant_id` des **ersten** Eintrags behalten. Schichten vom zweiten Restaurant werden so ausgeschlossen.

## Lösung

### `src/pages/shared/SharedZtView.tsx` — ZusammenfassungTab

**`getWeeklyHours` und `getEmpTotals`**: Statt `exportShifts` direkt `shifts` verwenden — da Mitarbeiter bereits auf eine Zeile pro id+department dedupliziert sind, werden alle ihre Schichten (über alle Restaurants) korrekt summiert. Kein Doppelzählungsrisiko.

```tsx
// Zeile 724 + 729: "exportShifts" → "shifts"
const getWeeklyHours = (...) => {
  return shifts.filter(...).reduce(...);  // statt exportShifts
};
const getEmpTotals = (...) => {
  const empShifts = shifts.filter(...);  // statt exportShifts
  ...
};
```

**`exportShifts` bleibt für PDF/Excel-Exporte** — dort wird die bisherige Logik beibehalten, da die Export-Funktionen ihre eigene Mitarbeiter-Liste mitbekommen.

Einzige Datei betroffen: `src/pages/shared/SharedZtView.tsx` (2 Zeilen ändern).

