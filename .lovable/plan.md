

## Echtzeit-Synchronisierung: Wochenplan → Zusammenfassung & Buchhaltung

### Problem
Wenn im Wochenplan Schichten geändert werden, werden nur die Query-Keys `zt-shifts`, `zt-shifts-period` und `zt-shifts-global` invalidiert. Die Zusammenfassung (`zt-summary-shifts`) und Buchhaltung (`zt-buchhaltung-shifts`) sowie die kumulierten Daten (`cumulated-shifts`) werden **nicht** invalidiert. Beim Tab-Wechsel zeigen diese Tabs daher veraltete gecachte Daten, bis React Query sie irgendwann als "stale" markiert.

### Lösung
An allen Stellen, die Schicht-Daten mutieren, auch die Query-Keys der anderen Tabs invalidieren.

**Datei 1: `src/pages/zeiterfassung/ZtWochenplan.tsx`** (~Zeile 385)
- Nach den bestehenden `invalidateQueries`-Aufrufen zusätzlich invalidieren:
  - `zt-summary-shifts`
  - `zt-buchhaltung-shifts`
  - `cumulated-shifts`

**Datei 2: `src/components/zeiterfassung/ShiftTimeOverride.tsx`** (3 Stellen: ~Zeile 245, ~370, ~499)
- Bereits invalidiert: `zt-summary-shifts` und `zt-shifts`
- Zusätzlich invalidieren:
  - `zt-buchhaltung-shifts`
  - `cumulated-shifts`

2 Dateien, keine DB-Änderung.

