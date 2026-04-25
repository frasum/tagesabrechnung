## Problem

Der Telegram-Report für YUM zeigt falsche Bargeld-Zahlen:
- `Wechselgeldbestand: -3.854,23 €` (negativ – sollte gegen 2.000 € Wechselgeld-Obergrenze laufen)
- `Bargeld: -5.854,23 €` (extrem negativ)

Die App-Ansicht (Bargeldbestand-Tabelle) zeigt diese Werte korrekt, weil sie die zentrale Logik nutzt. Der Telegram-Edge-Function `send-telegram-summary` rechnet hingegen mit einer **eigenen, veralteten Kopie** der Bargeld-Berechnung.

## Ursache

In `supabase/functions/send-telegram-summary/index.ts` (`calculateCashBalance`) gibt es drei zentrale Abweichungen von der korrekten Logik in `useCashBalanceData.ts` / `compute_carry_over`:

1. **Carry-Over Logik falsch (nur negativ)**
   - Telegram: `carryOver = bargeld < 0 ? bargeld : 0` – verwirft positive Salden komplett.
   - Korrekt: positive UND negative Salden werden weitergereicht (Cumulative Balance Chaining), bis Banküberweisungen sie abbauen.

2. **`bank_deposits` werden komplett ignoriert**
   - Die Edge Function lädt nur `register_transfers`, nicht `bank_deposits`.
   - Dadurch fehlt jeder Banktransfer in der Bilanz → Bargeld-Bestand driftet ins Minus.

3. **`Wechselgeldbestand` Berechnung weicht ab**
   - Die Function bildet `kassenbestand` aus den summierten Tageswerten ohne Banküberweisungen, gedeckelt auf `pettyCash`. Das passt nicht zur App-Anzeige (`remainingCash` aus dem Chaining).

Außerdem fehlt in der Function das Anfangs-Carry für den Zeitraum davor – sie startet immer beim ersten Session-Datum statt mit dem RPC-Resultat von `compute_carry_over`.

## Lösung

`send-telegram-summary` so umbauen, dass es exakt dieselbe Datenquelle und Logik verwendet wie die App-Ansicht.

### Änderungen in `supabase/functions/send-telegram-summary/index.ts`

1. **`calculateCashBalance` neu schreiben**:
   - `compute_carry_over` RPC aufrufen für `p_before_date = upToDate` → liefert den korrekten Anfangsstand bis zum Vortag.
   - Alternativ (sauberer): RPC für `from_date = upToDate` aufrufen und nur den einen Tag berechnen, dann `remainingCash` = `previousCarry + rawBargeld − depositEffect` als Bargeld anzeigen.
   - `bank_deposits` zusätzlich zu `register_transfers` laden und in die Tagesrechnung einbeziehen.
   - Carry-Over-Chaining identisch zu `useCashBalanceData` (positive + negative Salden chainen, `remainingCash` als nächste `carryOver`).

2. **Anzeigewerte anpassen**:
   - `Wechselgeldbestand` = `remainingCash` des Zieltages (entspricht dem, was die App in der Spalte zeigt – mit Vorzeichen).
   - `Bargeld` (Pfeil-Zeile) = `displayBargeld` oder `rawBargeld + min(0, prevRawBargeld)` für Konsistenz mit der Tagesabrechnung.

3. **Defensive Defaults**: alle Beträge mit `Number(...) || 0` absichern.

### Verifikation

- Edge Function deployen, dann manuell für `2026-04-23` (= Datum aus Screenshot) `send-telegram-summary` mit Restaurant YUM aufrufen.
- Werte gegen die App-Ansicht `/yum/cash-balance` für denselben Tag vergleichen → müssen 1:1 übereinstimmen.
- Anschließend mit „Test senden" in `/telegram-settings` final prüfen.

### Nicht betroffen

- Kellner-/Küchen-/Vectron-/Gäste-Logik bleibt unverändert (im Screenshot plausibel).
- `notify-pdf-export` braucht keine Änderung (sendet keine Bargeld-Zahlen).
