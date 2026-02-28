

## Wochenplan UI an Zeiterfassung-Projekt angleichen

### Problem
Das Wochenplan-UI in diesem Projekt verwendet einfache Tailwind-Klassen, waehrend das Zeiterfassung-Projekt ein ausgefeiltes CSS-Utility-System fuer die Tabelle hat (Zebra-Striping, transparente Input-Felder, Sonntags-/Feiertags-Spaltenfarben, Totals-Spalten-Hintergrund, Sticky-Column-Schatten).

### Aenderungen

**1. CSS-Utilities hinzufuegen (`src/index.css`)**

Die folgenden Wochenplan-spezifischen CSS-Klassen aus dem Zeiterfassung-Projekt uebernehmen:
- `wochenplan-table` Zebra-Striping (`zebra-even`) mit korrekten Hintergrundfarben
- `sticky-name` mit Box-Shadow fuer die fixierte Namensspalte
- `day-separator` mit 2px Border zwischen Tagen
- `sunday-col` mit roetlichem Hintergrund fuer Sonntage/Feiertage
- `totals-col` und `totals-header` mit blaeulichem Hintergrund
- `inactive-day` fuer Tage ausserhalb der Woche
- `time-input-clean` fuer transparente Zeitfelder die sich erst bei Hover/Focus zeigen
- CSS-Variablen `--dept-kueche`, `--dept-gl`, `--dept-service`

**2. Wochenplan-Komponente aktualisieren (`src/pages/zeiterfassung/Wochenplan.tsx`)**

Klassennamen in der Tabelle anpassen:
- `<th>` Header: `totals-header` und `sticky-name` Klassen hinzufuegen
- Department-Header-Row: `dept-header-row` Klasse hinzufuegen
- Mitarbeiter-Rows: `zebra-even` statt inline `bg-muted/20`
- Namensspalte: `sticky-name` statt `bg-background`
- Tagesspalten: `sunday-col`, `day-separator`, `inactive-day` CSS-Klassen statt inline Tailwind
- Totals-Spalten: `totals-col` Klasse hinzufuegen
- Time-Inputs: `time-input-clean` Klasse und `data-has-value` Attribut hinzufuegen

### Technische Details

Die CSS-Klassen verwenden `!important` an gezielten Stellen, um sicherzustellen, dass Zebra-Striping und Sonntags-Highlighting korrekt kaskadieren (z.B. `sunday-col` muss `zebra-even` ueberschreiben).

