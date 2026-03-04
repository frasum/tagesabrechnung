

## Plan: SFN-Zuschläge in Netto und Detailtabelle einrechnen

### Problem
Die SFN-Zuschläge (Nacht, Sonntag, Feiertag) werden zwar berechnet und separat angezeigt, aber **nicht** zum Netto-Betrag addiert. Die Netto-Karte zeigt nur `netMonthly` ohne Zuschläge.

### Lösung

**Datei: `src/pages/zeiterfassung/ZtBruttoNetto.tsx`**

1. **Netto-Karte**: Statt `result.netMonthly` den Wert `result.netMonthly + result.sfn.totalBonus` als "Netto-Auszahlung" anzeigen. Das reine Netto ohne Zuschläge bleibt in der Detailtabelle sichtbar.

2. **Detailtabelle erweitern**: Nach der Netto-Zeile die SFN-Zuschläge als Plus-Positionen einfügen:
   - `+ Nachtzuschlag (steuerfrei)`
   - `+ Sonntagszuschlag (steuerfrei)`
   - `+ Feiertagszuschlag (steuerfrei)`
   - **Netto-Auszahlung** (fett, als Summe)

3. **Separater SFN-Block** bleibt bestehen für die Detail-Aufschlüsselung (Stunden, Sätze).

### Ergebnis
- Die Netto-Karte zeigt den tatsächlichen Auszahlungsbetrag inkl. steuerfreier Zuschläge
- Die Detailtabelle macht die Zusammensetzung transparent

