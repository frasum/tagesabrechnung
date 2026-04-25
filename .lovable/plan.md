## Erklärung der Diskrepanz (24.04. – YUM)

Beide Werte basieren auf der **gleichen Tagesformel**, nutzen aber **unterschiedliche „Vortags-Fehlbetrag"-Quellen**:

**Heutige reine Tageskasse (rawBargeld) am 24.04.:**
```
6.811,50 (POS) − 6.054,53 (Karten) − 158,60 (Wolt) − 50,00 (Gutschein EL)
= 548,37 €
```

**Bargeldbestand-Tabelle, Spalte „Bargeld" (112,20 €):**
- Formel: `displayBargeld = rawBargeld(heute) + min(0, rawBargeld(gestern))`
- Nimmt **nur den Vortag (23.04.)** als Fehlbetrag-Quelle.
- 23.04. rawBargeld = 5.389,20 − 2.211,08 − 3.274,24 − 321,00 = **−417,12 €**
- → 548,37 + (−417,12) ≈ **131,25 €**

(Der angezeigte Wert 112,20 € weicht minimal ab — vermutlich Rundungen oder kleine Felder, die ich übersehe; die Mechanik stimmt.)

**Tagesabrechnung, „Differenz zum Wechselgeldbestand" (−6,24 €):**
- Formel: `bargeld = rawBargeld(heute) + min(0, rollender operativer Fehlbetrag)`
- Der **rollende operative Fehlbetrag** läuft über bis zu 90 Tage rückwärts und akkumuliert alle vorherigen unausgeglichenen Defizite. Überschüsse werden täglich „skimmed" (Tresor), Fehlbeträge bleiben offen, bis sie kompensiert werden.
- D.h. der 23.04. ist nicht nur −417,12 €, sondern enthält noch **alte ungetilgte Defizite aus früheren Tagen**.
- → 548,37 + (−554,61) ≈ **−6,24 €**

## Wo die Logik nicht stimmt

Die beiden Sichten **widersprechen sich konzeptionell**:

| Sicht | Vortagsbetrachtung | Konsequenz |
|---|---|---|
| Bargeldbestand-Spalte „Bargeld" | nur 1 Tag zurück | **unterschätzt** Fehlbeträge, wenn ältere Defizite noch offen sind |
| Tagesabrechnung „BARGELD" | rollend bis 90 Tage | korrekt operativ |

Beides soll laut Memory denselben „Differenz zum Wechselgeldbestand"-Gedanken abbilden — daher sollten sie identisch sein.

## Vorschlag zur Behebung

**Variante A (empfohlen):** Spalte „Bargeld" in der Bargeldbestand-Tabelle auf den **rollenden operativen Fehlbetrag** umstellen, identisch zur Tagesabrechnung.

- Datei: `src/hooks/useCashBalanceData.ts`
- Statt `displayBargeld = rawBargeld + min(0, prevRawBargeld)` (nur Vortag) eine laufende Variable `operativeBalance` mitführen, die täglich `rawBargeld` aufaddiert, Überschüsse als Skim entfernt und nur Defizite überträgt — exakt wie in `usePreviousDayDeficit.ts` (Zeilen 73–110).
- Damit zeigt die Spalte am 24.04. denselben Wert wie die Tagesabrechnung (≈ −6,24 €).

**Variante B:** Tagesabrechnung auf „nur Vortag" reduzieren — verwerfen, weil das echte Defizite verschleiert.

## Umsetzung (wenn freigegeben)

1. `src/hooks/useCashBalanceData.ts`: Berechnung von `displayBargeld` ersetzen durch laufenden Operativ-Saldo (Skim-on-Surplus über alle geladenen Tage seit `effectiveFromDate`, plus `initialCarryOver` als Startwert nur für den negativen Anteil).
2. Kommentar/Doku im Hook anpassen.
3. Memory-Eintrag `mem://features/reconciliation/cash-balance-visualization` aktualisieren.

Keine UI-Änderung, keine DB-Migration nötig.