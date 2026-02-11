

## Automatische Abschoepfung: Kassenbestand wird auf Wechselgeld gekappt

### Konzept
Wenn am Ende eines Tages der Kassenbestand (Wechselgeld + kumuliertes Bargeld) den Wechselgeld-Betrag (z.B. 2.000 EUR) uebersteigt, wird der Ueberschuss als "Abschoepfung" angezeigt. Der Kassenbestand wird auf den Wechselgeld-Betrag zurueckgesetzt. Die Abschoepfung wird **nur berechnet und angezeigt**, nicht separat gespeichert.

### Logik (Tag-fuer-Tag-Simulation)

```text
Fuer jeden Tag:
  kassenbestand = vorheriger_kassenbestand + bargeld_heute
  wenn kassenbestand > wechselgeld:
    abschoepfung = kassenbestand - wechselgeld
    kassenbestand = wechselgeld
  sonst:
    abschoepfung = 0
```

Beispiel mit Wechselgeld = 2.000 EUR:
- Tag 1: Bargeld 209,07 EUR -> Kassenbestand 2.209,07 -> Abschoepfung 209,07 -> Kassenbestand = 2.000
- Tag 2: Bargeld -50 EUR -> Kassenbestand 1.950 -> keine Abschoepfung -> Kassenbestand = 1.950
- Tag 3: Bargeld 300 EUR -> Kassenbestand 2.250 -> Abschoepfung 250 -> Kassenbestand = 2.000

### Technische Umsetzung

**1. `src/hooks/useRemainingCash.ts` erweitern**
- Statt einfach `pettyCash + sum(bargeld)` zu rechnen, Tag-fuer-Tag simulieren
- Neuen Rueckgabewert `todaySkimAmount` (Abschoepfung des aktuellen Tages) hinzufuegen
- Neuen Rueckgabewert `totalSkimmed` (kumulierte Abschoepfung) hinzufuegen
- Der `remainingCash` wird nun gekappt: maximal `pettyCash`

**2. `src/pages/DailySummary.tsx` anpassen**
- `todaySkimAmount` aus `useRemainingCash` auslesen
- Diesen Wert an `ExcelLayout` weitergeben

**3. `src/components/daily-summary/layouts/ExcelLayout.tsx` anpassen**
- Zwischen BARGELD und Kassenbestand eine neue Zeile "Abschoepfung" anzeigen (nur wenn > 0)
- Zeigt den Betrag, der ins Buero gebracht wird
- Styling: dezent, z.B. mit einem Pfeil-Icon

**4. `src/pages/CashBalance.tsx` (Monatsuebersicht) anpassen**
- Die kumulierte Kassenbestand-Berechnung ebenfalls auf die Tag-fuer-Tag-Simulation umstellen
- So stimmen Tagesabrechnung und Monatsuebersicht ueberein

### Was sich aendert fuer den Nutzer
- BARGELD bleibt unveraendert (209,07 EUR wie bisher)
- Neue Zeile "Abschoepfung": 209,07 EUR (Betrag fuer Buero)
- Kassenbestand: 2.000,00 EUR (statt 2.209,07 EUR)
- In der Monatsuebersicht wird ebenfalls die gedeckelte Berechnung verwendet

### Was gleich bleibt
- Bargeld-Formel aendert sich nicht
- Bankeinzahlungen funktionieren weiterhin wie bisher
- Fehlbetrag-Vortag-Berechnung bleibt unveraendert
- PDF-Export zeigt die Abschoepfung mit an

