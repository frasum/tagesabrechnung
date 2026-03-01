

## Plan: Export-Funktionen für Zusammenfassung (PDF + Excel)

Zwei neue Export-Dateien analog zum bestehenden Wochenplan-Export, plus Buttons in der Zusammenfassungs-UI.

### 1. Neue Datei `src/lib/exportZusammenfassungPdf.ts`

- Querformat A4, eine Seite
- Titel: "Zusammenfassung – {periodLabel}"
- Tabelle mit jsPDF autoTable: gleiche Struktur wie die UI-Tabelle
  - Spalten: Mitarbeiter | W1 | W2 | ... | Gesamt | Schichten | So/Fei | 20-24 | 24-x | U | K
  - Abteilungs-Header-Zeilen (farbig hinterlegt)
  - Abteilungs-Summenzeilen
  - Gesamtsumme als letzte Zeile
- Berechnung der Daten identisch zur bestehenden Komponente (getEmployeeTotals, getWeeklyHours etc.)
- Parameter: `periodLabel`, `employees`, `weeks`, `shifts`

### 2. Neue Datei `src/lib/exportZusammenfassungExcel.ts`

- Ein Sheet "Zusammenfassung"
- Gleiche tabellarische Struktur wie PDF
- Numerische Werte als Zahlen (nicht formatierte Strings), damit in Excel rechenbar
- Abteilungs-Header als eigene Zeilen

### 3. Änderung in `src/pages/zeiterfassung/ZtZusammenfassung.tsx`

- Import der beiden Export-Funktionen + `Button` + `FileDown`/`FileSpreadsheet` Icons
- Zwei Buttons neben dem Perioden-Select: "PDF" und "Excel"
- Buttons rufen die Export-Funktionen mit den bereits vorhandenen Daten auf (`employeesWithShifts`, `weeks`, `shifts`, `selectedPeriod.label`)

