

## Auto-Refetch für Lohnbüro-Portal

### Änderung

**Datei: `src/pages/shared/PayrollPortal.tsx`**

Beide `useQuery`-Aufrufe (Zeile 116 und 136) erhalten zwei zusätzliche Optionen:

```typescript
refetchInterval: 30_000,        // alle 30 Sekunden neu laden
refetchOnWindowFocus: true,     // bei Tab-Wechsel sofort aktualisieren
```

Das betrifft:
1. **Perioden-Query** (`payroll-periods`, Zeile 116) — damit neue freigegebene Perioden automatisch erscheinen
2. **Daten-Query** (`payroll-data`, Zeile 136) — damit Stunden und Schichten aktuell bleiben

Eine Datei, zwei Zeilen pro Query. Keine neuen Abhängigkeiten.

