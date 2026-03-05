

## Zuschlagsspalten nur für Admins sichtbar

Die SFN-Zuschlagsspalten (20-24, 24-x, So/Fei bzw. So, Fei 125%, Fei 150%) sollen komplett ausgeblendet werden für Nutzer mit Manager- oder Staff-Berechtigung. Nur Admins sehen diese Spalten.

### Betroffene Dateien

**1. `src/pages/zeiterfassung/ZtWochenplan.tsx`**
- `useAuth` importieren und `hasPermission('admin')` prüfen
- `const showSfn = hasPermission('admin');`
- Header: Die 3-5 SFN-Spalten (20-24, 24-x, So/Fei) nur rendern wenn `showSfn`
- Body: Die entsprechenden `<td>`-Zellen für evening, night, soFei/sonntag/feiertag nur rendern wenn `showSfn`

**2. `src/pages/zeiterfassung/ZtZusammenfassung.tsx`**
- `hasPermission` ist bereits verfügbar via `useAuth`
- `const showSfn = hasPermission('admin');`
- Header, Employee-Rows, Department-Subtotals und Grand-Total-Footer: SFN-Spalten bedingt rendern
- `colSpan` für Department-Header anpassen

**3. `src/pages/zeiterfassung/buchhaltung/BuchhaltungTableHead.tsx`**
- Neues Prop `showSfn?: boolean` hinzufügen
- SFN-Spalten (20-24, 24-x, So/Fei) und zugehörige `<col>`-Definitionen bedingt rendern

**4. `src/pages/zeiterfassung/buchhaltung/BuchhaltungRow.tsx`**
- Neues Prop `showSfn?: boolean` hinzufügen
- Die 3-5 SFN-`<td>`-Zellen bedingt rendern

**5. `src/pages/zeiterfassung/buchhaltung/BuchhaltungFooter.tsx`** (falls vorhanden mit SFN-Spalten)
- Prüfen und ggf. `showSfn` Prop durchreichen

**6. `src/pages/zeiterfassung/ZtBuchhaltung.tsx`**
- `useAuth` importieren, `showSfn` berechnen und an `BuchhaltungTableHead`, `BuchhaltungRow`, `BuchhaltungFooter` weitergeben

### Logik
- `showSfn = hasPermission('admin')` — nur Admins sehen die Zuschlagsspalten
- Alle anderen Spalten (Gesamt, Schichten, U, K, Vorschuss, Besonderheiten) bleiben für alle sichtbar

