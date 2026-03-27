

## Fix: Urlaubstage-Anzeige in Besonderheiten

### Problem
`formatSickRanges` zeigt Kalendertage im Datumsbereich: `U: 02.03.–25.03. (24T)`. Das sind 24 Kalendertage, aber nur 18 sind tatsächliche Urlaubstage (Wochenenden werden abgezogen). Die Urlaubsspalte zeigt korrekt 18 — der Besonderheiten-Text ist irreführend.

### Lösung
Für Urlaub die tatsächliche Anzahl der eingetragenen Urlaubstage im Bereich anzeigen statt Kalendertage.

**`src/pages/zeiterfassung/buchhaltung/BuchhaltungRow.tsx`**
- Statt `formatSickRanges(vacRanges)` eine eigene Formatierung verwenden, die die tatsächliche Anzahl der Urlaubs-Schichten zählt (nicht Kalendertage)
- Oder: Einfach die Gesamtzahl aus `totals.urlaubTage` verwenden: `U: 02.03.–25.03. (18T)`

Konkret: Eine neue Hilfsfunktion `formatVacationRanges(ranges, shifts)` erstellen, die pro Bereich die tatsächlichen Urlaubs-Shifts zählt statt `toDate - fromDate + 1`.

**`src/lib/shiftCalculations.ts`**
- Neue Funktion `formatVacationRanges` hinzufügen, die wie `formatSickRanges` arbeitet, aber die Tage aus den tatsächlichen Shifts zählt

2 Dateien, keine DB-Änderung.

