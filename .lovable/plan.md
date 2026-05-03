## Problem

In der Tabelle **Bargeldbestand** zeigt die letzte Spalte „Bargeld" pro Tag den Wert `displayBargeld` (= Tageskasse **abzüglich** des bis zu 90 Tage zurückreichenden, rollenden operativen Fehlbetrags aus der Tagesabrechnung).
Die letzte Zeile **GESAMT** summiert dagegen `rawBargeld` (reine Tageskasse, ohne Übertrag).

Dadurch ergibt die Summe der sichtbaren Tageswerte **nie** den GESAMT-Wert — genau das, was du in deiner Excel-Gegenrechnung gesehen hast. Das gleiche Mismatch steckt auch im Excel-Export (`src/utils/excelExport.ts`: Datenzeilen `row.displayBargeld`, Totalzeile `acc.bargeld + n(row.rawBargeld)`).

Beispielrechnung: An einem Tag mit Tageskasse +10 € und kumuliertem Vortagsdefizit −6,24 € steht in der Spalte −6,24 → 0 → … (skim-Logik), aber der GESAMT addiert die ursprünglichen +10 €. Spalte ≠ Summe → letzte Zelle „falsch".

## Ursache

Die Tagesabrechnungs-Logik (`usePreviousDayDeficit`) wurde — auf deinen früheren Wunsch hin — in `useCashBalanceData.computeDisplayBargeld` 1:1 in jede Zeile der Bargeldbestands-Tabelle gespiegelt. Diese Logik ist aber **nicht summierbar**: die Skim-on-Surplus-Mechanik macht aus Überschüssen 0, was beim Aufaddieren Geld „verschluckt".

Eine monatliche Übersicht braucht aber genau das Gegenteil: jede Zelle muss als reiner Tagesbeitrag aufaddierbar sein, sonst stimmt die Spaltensumme nie.

## Lösung

Trennung der beiden Sichten klar wiederherstellen:

1. **Spalte „Bargeld" pro Tag** → wieder `rawBargeld` anzeigen (reine Tageskasse, inkl. Kassentransfer). Damit ist Σ Spalte = GESAMT exakt.
2. **Vortags-Defizit-Information bleibt erhalten**, aber wandert in den Tooltip:
   - Tooltip zeigt zusätzlich „kumulierter offener Fehlbetrag bis zu diesem Tag" als reine Info, ohne die Zelle zu verändern.
3. **Excel-Export** (`src/utils/excelExport.ts`): Datenzellen ebenfalls auf `rawBargeld` umstellen, damit die exportierte Datei in sich konsistent ist und mit deiner manuellen Excel-Gegenrechnung übereinstimmt.
4. **PDF-Export** (`src/utils/pdfExport.ts`): gleiche Umstellung — `displayBargeld ?? bargeld` → `bargeld` (= rawBargeld) in Datenzeilen.
5. `displayBargeld` bleibt im Datenmodell erhalten (nicht entfernen), wird in dieser Ansicht aber nicht mehr für die Spalte verwendet. Die Tagesabrechnung-Seite (`useRemainingCash` / „in den Tresor legen") nutzt sie unverändert weiter — dort ist die Skim-Logik korrekt.

## Geänderte Dateien

- `src/pages/CashBalance.tsx` — Bargeld-Zelle und Tooltip
- `src/utils/excelExport.ts` — Datenzeilen
- `src/utils/pdfExport.ts` — Datenzeilen + interner Hook
- `src/hooks/useCashBalanceData.ts` — Kommentar/Doku zu `displayBargeld` aktualisieren (Berechnung selbst bleibt unverändert, da von Tagesabrechnung genutzt)

## Erwartetes Ergebnis

- Σ der Tageswerte in Spalte „Bargeld" = GESAMT-Wert in der letzten Zeile (auf den Cent genau).
- Excel-Export deckt sich mit deiner manuellen Excel-Datei.
- Die Tagesabrechnungs-Seite und der „in den Tresor legen"-Wert bleiben unverändert (dort ist die Defizit-Skim-Logik gewollt).
