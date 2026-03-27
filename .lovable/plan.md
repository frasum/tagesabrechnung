

## Fix: Zusammenfassung zeigt falsche Summen bei Restaurant-Filter

### Problem
Bei Auswahl eines anderen Restaurants (z.B. YUM aus der Spicery-Ansicht) zeigt die **Zusammenfassung** falsche Gesamtsummen:
- **YUM Zusammenfassung GESAMT**: 206,90 (falsch — enthält Spicery-Daten)
- **YUM Buchhaltung GESAMT**: 132,75 (korrekt)

Die Differenz (74,15) entspricht exakt den Spicery-Daten.

### Ursache
In `ZtZusammenfassung.tsx` berechnen zwei Funktionen ihre Summen über **alle geladenen Schichten**, anstatt nur die Schichten der gefilterten Mitarbeiter zu berücksichtigen:

1. **`getDepartmentTotals`** (Zeile 199): Filtert Schichten nur nach `department`, nicht nach den angezeigten Mitarbeitern → Spicery-Küchenschichten werden in die YUM-Küchensumme eingerechnet
2. **`grandTotals`** (Zeile 214): Verwendet `shifts` komplett ungefiltert → alle Schichten beider Restaurants werden summiert

Im Vergleich: Die **Buchhaltung** macht es richtig — sie iteriert über `employeesWithShifts` und ruft `getEmployeeTotals` pro Mitarbeiter auf.

### Lösung
**Datei: `src/pages/zeiterfassung/ZtZusammenfassung.tsx`**

1. **`getDepartmentTotals`** anpassen: Nur Schichten von Mitarbeitern berücksichtigen, die auch in `employeesWithShifts` enthalten sind
2. **`grandTotals`** anpassen: Statt alle Schichten zu summieren, nur über die gefilterten Mitarbeiter iterieren (analog zur Buchhaltung)

Konkret:
- `getDepartmentTotals`: Schichten zusätzlich filtern auf `employee_id`s, die in den angezeigten Mitarbeitern der jeweiligen Abteilung vorkommen
- `grandTotals`: Über `employeesWithShifts` iterieren und `getEmployeeTotals` pro Mitarbeiter aufrufen, statt blind `allShifts` zu summieren

1 Datei, keine DB-Änderung.

