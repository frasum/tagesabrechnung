

## Fix: Doppelte Zeilen durch fehlenden Restaurant-Key

### Problem
Die React-Key-Generierung in der Zusammenfassung (und wahrscheinlich auch Wochenplan/Buchhaltung) nutzt nur `${emp.id}-${emp.department}`. Wenn ein Mitarbeiter dieselbe Abteilung in zwei Restaurants hat (z.B. GL bei YUM und GL bei Spicery), erzeugt das identische Keys. React rendert dann die erste Zeile doppelt.

### Lösung
Den React-Key um `restaurant_id` erweitern:

```
key={`${emp.id}-${emp.department}-${(emp as any).restaurant_id ?? ''}`}
```

### Betroffene Dateien
1. **`src/pages/zeiterfassung/ZtZusammenfassung.tsx`** — Zeile 279: Key erweitern
2. **`src/pages/zeiterfassung/ZtWochenplan.tsx`** — gleicher Fix an der `map`-Stelle
3. **`src/pages/zeiterfassung/ZtBuchhaltung.tsx`** — gleicher Fix

3 Dateien, jeweils 1 Zeile.

