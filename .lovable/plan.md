

# Tagesabrechnung: Wechselgeldbestand-Logik korrigieren

## Was du siehst (Spicery, 21.04.)
- Tages-Bargeld: **−200 €** (nur Vorschuss)
- Differenz zum Wechselgeldbestand: **+3.261,96 €** ❌
- Bargeld in den Tresor legen: **3.261,96 €** ❌
- Wechselgeldbestand: **5.261,96 €** ❌

## Was korrekt wäre
- Tages-Bargeld: −200 € ✓
- Differenz zum Wechselgeldbestand: **−200 €** (Fehlbetrag, da heute nur Ausgang)
- Bargeld in den Tresor legen: **0 €** (kein Überschuss zum Skimmen)
- Wechselgeldbestand: **1.800 €** (2000 − 200)

## Ursache
Die Tagesabrechnung mischt heute zwei Dinge in einer Zahl:
1. den **heutigen Bargeldeffekt** (−200 €)
2. den **gesamten historischen Übertrag** (+3.461,96 € aus alten Überschüssen)

Konkret im Code (`src/pages/DailySummary.tsx`):
- `bargeld = …Tageswerte… + previousDeficit` (≈ +3.261,96 €)
- Diese Zahl wird als **„Differenz zum Wechselgeldbestand"** gelabelt — falsch.
- `useRemainingCash` rechnet dann **`pettyCash (2000) + remainingCash-Kette`** und addiert damit den Überschuss erneut auf das Soll-Wechselgeld auf — **doppelte Zählung**.

Der Carry-Over enthält (nach der Vereinheitlichung) auch positive Salden. Solange diese Überschüsse nicht per Bankeinzahlung abgeführt sind, hängen sie als „virtuelles Bargeld" in der Kette und blähen die heutige Anzeige auf.

## Fachliche Definition (aus deiner Aussage)
- **Wechselgeldbestand-Soll: 2.000 € konstant.**
- **Skim-Logik:** Nur der Betrag **oberhalb von 2.000 €** wird in den Tresor gelegt → Kasse fällt am Ende jedes Tages wieder auf 2.000 € (es sei denn, es ist ein Fehlbetrag).
- Nicht abgeschöpfte historische Überschüsse gehören in die Bankeinzahlungs-Pipeline, **nicht** in die heutige „Differenz".

## Lösung — die Anzeige auf den heutigen Tag normieren

### 1. „Differenz zum Wechselgeldbestand" = nur heutiger Effekt + ggf. Vortags-Fehlbetrag (negativ)
Statt `bargeld` (mit vollem Carry) wird angezeigt:
```
diffWechselgeld = bargeldRaw + min(previousDeficit, 0)
```
- positiver Vortagsübertrag fließt **nicht** mehr in diese Zeile (gehört in Bankeinzahlung)
- negativer Vortagsübertrag (echter Fehlbetrag) bleibt drin

Im Beispiel: −200 + 0 = **−200 €** ✓

### 2. „Bargeld in den Tresor legen" (Skim) = Überschuss heute über 2.000 €
```
skim = max(0, diffWechselgeld)   // nur wenn heute Überschuss
```
Im Beispiel: max(0, −200) = **0 €** ✓

### 3. „Wechselgeldbestand (soll 2000 €)" = 2000 + diffWechselgeld − skim
Da `skim` den positiven Anteil entfernt, landet die Anzeige bei:
- Überschuss-Tag: 2000 € (perfekt aufgefüllt)
- Fehlbetrag-Tag: 2000 + Fehlbetrag (z. B. 1.800 €)

Im Beispiel: 2000 + (−200) − 0 = **1.800 €** ✓

### 4. „Fehlbetrag Vortag"-Zeile bleibt
Wird wie bisher nur eingeblendet, wenn `previousDeficit < 0` — bildet die Brücke zwischen Tagesabrechnung und Bargeldbestand-Seite.

### 5. `useRemainingCash` umbauen
Liefert künftig:
- `remainingCash` = 2000 + diffWechselgeld − skim (für die Tagesanzeige)
- `todaySkimAmount` = skim (siehe oben)
- `previousDeficit` = wie gehabt aus `useCashBalanceData`

Damit ist die Hook-Ausgabe semantisch eindeutig: **Stand der Wechselgeldkasse am Ende des Tages**, nicht „Wechselgeld + alle historischen Überschüsse".

### 6. StatCard „Wechselgeldbestand" oben rechts
Erbt automatisch den korrigierten `remainingCash` — keine separate Änderung nötig.

### 7. Bargeldbestand-Seite (`CashBalance.tsx` / `CashBalanceSummary`)
Bleibt bei der **kumulativen Sicht** (zeigt also weiterhin auch nicht-eingezahlte Altüberschüsse), denn das ist dort gewünscht. Die Karte „Wechselgeldbestand" dort wird umbenannt zu **„Verbleibendes Bargeld (kumulativ)"**, damit die Begriffe nicht mehr kollidieren mit dem Tages-Wechselgeldbestand.

## Betroffene Dateien
- `src/pages/DailySummary.tsx` — neue Variable `diffWechselgeld`, Übergabe an Layout
- `src/components/daily-summary/layouts/ExcelLayout.tsx` — zeigt `diffWechselgeld` statt `bargeld` in der „Differenz"-Zeile
- `src/hooks/useRemainingCash.ts` — neue Formel (Tages-normiert)
- `src/utils/pdfExport.ts` — gleiche Formel im PDF
- `src/components/cash-balance/CashBalanceSummary.tsx` — Karte umbenennen zu „Verbleibendes Bargeld (kumulativ)"

## Erwartetes Ergebnis am 21.04. Spicery
| Zeile | Vorher | Nachher |
|---|---:|---:|
| Tages-Bargeld | −200 € | −200 € |
| Differenz zum Wechselgeldbestand | 3.261,96 € | **−200 €** |
| In den Tresor legen | 3.261,96 € | **0 €** |
| Wechselgeldbestand (soll 2000) | 5.261,96 € | **1.800 €** |

Die historischen Überschüsse bleiben als „Verbleibendes Bargeld (kumulativ)" auf der Bargeldbestand-Seite sichtbar und verschwinden dort erst, wenn sie per Bankeinzahlung abgeführt werden.

