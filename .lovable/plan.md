

## Mitarbeiter-Checkboxen in 3 Spalten anzeigen

In `src/components/zeiterfassung/ShiftTimeOverride.tsx` werden die drei Mitarbeiter-Listen (Bestehende Schichten, Mo-Fr, Mo-So) von einer einspaltigen Liste auf ein 3-Spalten-Grid umgestellt.

### Aenderung

Die drei `div`-Container mit `className="space-y-2 max-h-60 overflow-y-auto"` werden ersetzt durch:

```
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
```

Das `max-h-60 overflow-y-auto` wird entfernt, da bei 3 Spalten kein Scrollen mehr noetig ist.

Betrifft drei Stellen in der Datei (ca. Zeilen 283, 310, 337).

