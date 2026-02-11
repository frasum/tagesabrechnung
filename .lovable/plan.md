

## Bug: „Sonstige Einnahmen" fehlen in der BARGELD-Berechnung

### Problem
Das Feld „Sonstige Einnahmen" wird zwar gespeichert, aber nirgendwo in die BARGELD-Berechnung einbezogen. Der bisherige Kommentar im Code lautet: *„sonstige_einnahme is already included in pos_total (Vectron)"* -- das stimmt aber nicht, wenn der Wert manuell separat eingetragen wird. Das Ergebnis: 500 EUR eingegeben, aber weder BARGELD noch Kassenbestand aendern sich.

### Loesung
`sonstige_einnahme` wird in allen BARGELD-Formeln als **Einnahme addiert** (genau wie `vouchers_sold`).

### Betroffene Dateien (5 Stellen)

1. **`src/pages/DailySummary.tsx`** (Zeile ~272)
   - `+ formData.sonstige_einnahme` zur Bargeld-Formel hinzufuegen

2. **`src/pages/ManagerDashboard.tsx`** (Zeile ~231)
   - `+ formData.sonstige_einnahme` zur bargeldPreview-Formel hinzufuegen

3. **`src/hooks/useCashBalanceData.ts`** (Zeile ~78)
   - `+ sonstigeEinnahme` zur Bargeld-Formel hinzufuegen (Variable aus `session.sonstige_einnahme` lesen)

4. **`src/hooks/usePreviousDayDeficit.ts`** (Zeile ~80)
   - `+ sonstigeEinnahme` zur Bargeld-Formel hinzufuegen (Variable ist dort bereits gelesen, nur nicht verwendet)

5. **`src/hooks/useStatistics.ts`** (Zeile ~147)
   - `+ (session.sonstige_einnahme || 0)` zur Bargeld-Formel hinzufuegen

### Auswirkung
- BARGELD steigt um den Betrag der sonstigen Einnahmen
- Kassenbestand passt sich entsprechend an
- Fehlbetrag-Vortag-Berechnung beruecksichtigt den Wert ebenfalls
- Statistiken zeigen korrekte Werte

### Risiko
Gering. Reine Addition eines bereits gespeicherten Feldes. Keine Schema-Aenderungen noetig.
