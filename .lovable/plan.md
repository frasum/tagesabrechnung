

# Tagesabrechnung: „Fehlbetrag Vortag" auf isolierten Vortageswert umstellen

## Ziel
Die Tagesabrechnung soll **unabhängig vom kumulativen Bargeldbestand** funktionieren:
- Wechselgeld-Soll = **2.000 €** (mit Skimming bei Tagesüberschuss)
- Ein **Minus aus dem direkten Vortag** wird heute als „Fehlbetrag Vortag" mitgerechnet
- Ein **Plus aus dem Vortag** bleibt **außen vor** — gehört in die Bankeinzahlungs-Pipeline / Bargeldbestand-Seite

## Änderung der Logik

### Heute (kumulativ — falsch für Tagesabrechnung)
`previousDeficit` = kumulativer Übertrag aller Vortage (`previousCarry` aus der gechainten Bargeldbestand-Reihe). Wenn die Kette insgesamt im Plus ist, wird ein einzelner Minus-Vortag „verschluckt".

### Neu (isoliert — entspricht deinem mentalen Modell)
`previousDeficit` = **`rawBargeld` des unmittelbar vorhergehenden Tages mit Daten**, gekappt auf ≤ 0:
- Vortag −91,69 € → Anzeige „Fehlbetrag Vortag −91,69 €", Wechselgeld heute = 2.000 + Tageseffekt − 91,69
- Vortag +230,43 € → keine Anzeige, Wechselgeld heute = 2.000 + Tageseffekt (Skim)
- Kein Vortag vorhanden → 0

„Unmittelbar vorhergehender Tag mit Daten" = letzter Eintrag in `cashRows` mit `date < heute` (überspringt geschlossene Tage automatisch, identisch zum aktuellen Fallback-Pfad).

## Betroffene Dateien

### `src/hooks/usePreviousDayDeficit.ts`
- Nicht mehr `previousCarry` / `remainingCash` aus der Kette nutzen.
- Stattdessen: letzten Vortags-Eintrag mit `date < heute` finden und `Math.min(0, row.rawBargeld)` zurückgeben.
- JSDoc anpassen: „Returns the previous business day's standalone cash result, capped at 0 (only deficits)."

### Keine Änderung nötig in:
- `useRemainingCash.ts` — die Formel `rawBargeld + min(previousCarry, 0)` bleibt korrekt, da der Hook jetzt den richtigen Wert liefert.
- `DailySummary.tsx` — `bargeld = bargeldRaw + Math.min(previousDeficit, 0)` bleibt, Variable hat nur jetzt die richtige Semantik.
- `ExcelLayout.tsx` — Bedingung `previousDeficit < 0` zeigt die Zeile weiterhin korrekt.
- `pdfExport.ts` — Bedingung identisch, Wert wird richtig im PDF gerendert.
- `CashBalance.tsx` / Bargeldbestand — bleibt **vollständig unverändert** (kumulative Sicht weiter dort).

## Erwartetes Ergebnis (für YUM, 22.04.)
- Vortag 21.04. hatte `rawBargeld = +230,43 €` → **keine** „Fehlbetrag Vortag"-Zeile (Vortag im Plus)
- Wäre der 21.04. negativ gewesen, würde dieser Wert (z. B. die −37,22 € vom 20.04. an einem 21.04.) als Fehlbetrag erscheinen
- Bargeldbestand-Seite bleibt unverändert kumulativ (+4.521,44 € Übertrag) — keine Doppelzählung, weil die Tagesabrechnung jetzt sauber getrennt ist

## Hinweis zur Konsistenz
Tagesabrechnung und Bargeldbestand zeigen damit bewusst **unterschiedliche Zahlen** — das ist gewollt:
- Tagesabrechnung = operative Sicht „Wechselgeldkasse heute"
- Bargeldbestand = buchhalterische Sicht „Gesamt-Bargeld kumuliert"

