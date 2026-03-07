

# Ø Stundenumsatz in Tagesdetails — alle Abteilungen

## Ziel
Neue Spalte "Ø €/h" in der Tagesdetails-Tabelle, die den **Stundenumsatz** pro Tag zeigt: `Tagesumsatz ÷ Gesamtstunden aller Mitarbeiter (Service + Küche + GL)`.

## Änderungen

### `src/pages/zeiterfassung/ZtProvision.tsx`

1. **Neuer Query**: Alle `zt_shifts` für den Periodenzeitraum laden (ohne Department-Filter), gruppiert nach `shift_date` → `Map<date, totalAllHours>`

2. **DayBreakdown-Typ erweitern**: Neues Feld `allHours: number` (Stunden aller Abteilungen)

3. **dailyBreakdown-Memo**: Für jeden Tag die Gesamtstunden aus dem neuen Query einsetzen

4. **Tabelle**: Neue Spalte "Ø €/h" nach "Ø / MA (€)" — zeigt `revenue / allHours`

5. **Footer**: Durchschnitt oder Gesamt-Ø anzeigen

### Kein DB-Änderungsbedarf

Die Daten kommen aus der bestehenden `zt_shifts`-Tabelle, nur ohne Department-Filter.

