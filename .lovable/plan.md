

## Problem

Die App unterscheidet nicht zwischen dem 25%- und dem 40%-Nachtzuschlag gemäß §3b EStG:
- **25%**: Nachtarbeit 20:00–00:00 und 04:00–06:00
- **40%**: Nachtarbeit 00:00–04:00, wenn die Schicht **vor** Mitternacht begann

Zusätzlich werden Abendstunden an Sonntagen/Feiertagen möglicherweise falsch aus den Nachtstunden herausgerechnet.

## Änderungen

### 1. Shift-Daten erweitern: `night_hours` aufsplitten

**Datenbank-Migration:** Neue Spalte `night_deep_hours` (NUMERIC, default 0) in `zt_shifts` für die 00:00–04:00-Stunden.

### 2. `src/lib/shiftCalculations.ts` anpassen

`calculateShiftHours` soll neben `nightHours` auch `nightDeepHours` zurückgeben:
- `eveningHours`: 20:00–00:00 (bleibt, 25%)
- `nightHours`: 00:00–06:00 nach Mitternacht (bleibt als Gesamt)
- `nightDeepHours`: 00:00–04:00 (neu, für 40%-Zuschlag, nur wenn Schicht vor Mitternacht begann)
- Reguläre Nachtstunden (04:00–06:00): weiterhin 25%

### 3. Alle Stellen aktualisieren, die Schichten schreiben

- `ZtWochenplan.tsx` (Schicht-Erstellung/Update)
- `syncWaiterToZt.ts` (Sync aus Tagesabrechnung)
- `ShiftTimeOverride.tsx` (Batch-Updates)

Diese müssen `night_deep_hours` korrekt berechnen und speichern.

### 4. `ZtBruttoNetto.tsx` – SFN-Aggregation

Nachtstunden-Aggregation aufsplitten:
- `night25Hours`: evening (20–00) + night nach 04:00 (04–06) minus Sonntags/Feiertags-Overlap
- `night40Hours`: night_deep_hours (00–04) minus Sonntags/Feiertags-Overlap

### 5. SFN-Raten erweitern

`src/lib/sfnRates.ts` und Edge Function `calculate-payroll`:
```
night25: 0.25,  // 20:00–00:00, 04:00–06:00
night40: 0.40,  // 00:00–04:00 (Schichtbeginn vor Mitternacht)
```

### 6. Edge Function `calculate-payroll`

Neue Eingabe `sfnHours.night40` akzeptieren und separaten Bonus berechnen:
- `night25Bonus = night25Hours × rate × 0.25`
- `night40Bonus = night40Hours × rate × 0.40`

### 7. UI-Anzeige

Schichtdaten-Box in `ZtBruttoNetto.tsx`:
- "Nachtstunden 25%: XX h" und "Nachtstunden 40%: XX h" separat anzeigen
- Detailtabelle mit beiden Nacht-Positionen

### 8. Bestehende Schichtdaten migrieren

SQL-Migration die für alle existierenden Schichten `night_deep_hours` aus `start_time`/`end_time` nachberechnet (Overlap mit 00:00–04:00 bei Schichten die vor Mitternacht beginnen).

## Reihenfolge

1. DB-Migration (neue Spalte + Backfill)
2. `shiftCalculations.ts` erweitern
3. Schicht-Schreibstellen aktualisieren
4. SFN-Raten & Edge Function
5. `ZtBruttoNetto.tsx` Aggregation & UI
6. Testen mit BUN Feb 2026: Erwartung 88h@25% + 22h@40% = 818,40€

