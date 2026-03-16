

## Bewertung: Ist das sinnvoll?

Kurze Antwort: **Teilweise ja, aber nicht alles lohnt sich gleich.**

### Feature-Bewertung

| Feature | Aufwand | Nutzen | Empfehlung |
|---------|---------|--------|------------|
| **Keyboard Navigation** | Mittel | Hoch -- schnellere Bedienung ohne Maus | Ja |
| **Vorwoche kopieren** | Gering | Hoch -- bei wiederkehrenden Plänen riesige Zeitersparnis | Ja |
| **Bulk Fill (mehrere Tage)** | Mittel | Mittel -- nützlich, aber "Vorwoche kopieren" deckt den Hauptfall ab | Optional |
| **Drag to Fill** | Hoch | Gering -- komplex (Drag-Bibliothek, Touch-Support, Popover-Konflikte), fragil in kleinen Zellen | Nein |

### Empfohlener Umfang (pragmatisch)

**1. Keyboard Navigation** -- Arrow keys bewegen den Fokus durch das Grid, Enter/Space öffnet die Skill-Auswahl oder toggelt die Schicht. Erfordert eine fokussierte Zelle (State `[rowIdx, colIdx]`) im Grid statt in jeder ShiftCell.

**2. Vorwoche kopieren** -- Button in der Toolbar: kopiert alle Schichten von Mo-So der Vorwoche auf die aktuelle Woche. Nutzt `useUpsertShift` im Batch. Einfach, großer Zeitgewinn.

**3. Bulk Fill (vereinfacht)** -- Statt komplexer Mehrfachselektion: ein "Wochentage füllen"-Modus, bei dem man einen Mitarbeiter + Skill wählt und alle z.B. Mo-Fr einer Woche auf einmal belegt.

**Drag to Fill weglassen** -- Die Zellen sind 52px breit, Touch/Mobile ist ein Hauptnutzungsfall, und das Popover-System (Radix) kollidiert mit Drag-Events. Der Aufwand steht in keinem Verhältnis zum Nutzen.

### Technische Umsetzung

**MonthlyGrid.tsx**
- `focusedCell` State `[empIndex, dateIndex]` hinzufügen
- `onKeyDown`-Handler auf dem `<table>`: Arrow keys verschieben den Fokus, Enter/Space triggert Klick auf die aktive Zelle
- `tabIndex={0}` auf die Tabelle, `data-focused`-Attribut auf die fokussierte `ShiftCell`

**ShiftCell.tsx**
- Neues Prop `isFocused: boolean` -- rendert einen sichtbaren Fokusring
- `ref` forwarden damit der Grid per `scrollIntoView` die Zelle sichtbar halten kann

**DienstplanToolbar.tsx**
- Button "Vorwoche kopieren" hinzufügen
- Berechnet die aktuelle Kalenderwoche, lädt Shifts der Vorwoche, und erstellt Batch-Inserts für die neue Woche (nur für leere Tage, um Überschreiben zu vermeiden)

**useDienstplan.ts**
- Neue Mutation `useBatchInsertShifts` für effizientes Einfügen mehrerer Schichten in einem Call

