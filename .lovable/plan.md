

# Fix: "Bargeld bis März" zeigt einfache Summe der Tageswerte

## Problem
Die `cumulativeCash`-Berechnung (Zeilen 55–69) nutzt eine Skimming-Simulation, die den Wert auf -368 € drückt. Der Nutzer möchte stattdessen die einfache Summe (1.806,56 €) sehen — identisch mit der GESAMT-Zeile der Tabelle.

## Lösung

### `src/pages/CashBalance.tsx` (Zeilen 55–69)
Die Skimming-Simulation durch eine einfache Summe ersetzen:

```tsx
const cumulativeCash = useMemo(() => {
  if (!data || !selectedMonth) return 0;
  return data
    .filter((row) => row.date <= `${selectedMonth}-31`)
    .reduce((sum, row) => sum + (row.rawBargeld ?? row.bargeld), 0);
}, [data, selectedMonth]);
```

Einzeilige Änderung, keine anderen Dateien betroffen.

