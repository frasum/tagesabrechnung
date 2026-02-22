

## PDF-Layout Verbesserung: Tagesabrechnung

### Was wird geaendert

Die flache Liste der Tagesabrechnung im PDF wird durch **Sektions-Ueberschriften** visuell gruppiert und die Bezeichnungen werden klarer gestaltet. **Null-Zeilen bleiben sichtbar** wie gewuenscht.

### Aenderungen im Detail

#### 1. Sektions-Ueberschriften (graue Header-Zeilen)

Analog zur farbigen Web-Ansicht werden graue Trennzeilen eingefuegt, die die Daten in logische Bloecke gliedern:

| Sektion | Enthaltene Zeilen |
|---|---|
| **Umsatz** | POS-Umsatz, Gaeste/Durchschnittsverzehr |
| **Kartenzahlung** | KK (Terminal) |
| **Take Away** | SoUse/OrderSmart, Wolt |
| **Gutscheine & Abzuege** | Gutscheine EL, FineDine, Gutscheine VK, Offen, Personal, Einladung, Sonstige Einnahme, Fehlbetrag Vortag, Bar Ausgaben |
| **Ergebnis** | Tages-Bargeld, HilfMahl, Bargeld mit HilfMahl, ohne hilfmahl, Wechselgeldbestand |

#### 2. Bezeichnungen anpassen

- "Bargeld mit HilfMahl" wird zu **"Differenz zum Wechselgeldbestand"** (konsistent mit Web-Ansicht)
- "ohne hilfmahl" wird nur angezeigt wenn HilfMahl ungleich 0 ist (da der Wert sonst identisch mit der Zeile darueber ist und keine Information bringt)

#### 3. Visuelle Hierarchie

- Sektions-Header: grauer Hintergrund (`fillColor: [241, 245, 249]`), Fettschrift, leicht groessere Schrift (8pt statt 7pt)
- Ergebnis-Zeilen bleiben wie bisher hervorgehoben (Rahmen, Fettschrift)

### Betroffene Datei

| Datei | Aenderung |
|---|---|
| `src/utils/pdfExport.ts` | `summaryRows`-Aufbau (Zeilen 157-187): Sektions-Header einfuegen, Bezeichnung aendern, "ohne hilfmahl" bedingt anzeigen |

### Technische Umsetzung

- Sektions-Header werden als eigene Zeilen im `summaryRows`-Array eingefuegt mit `styles: { fillColor: [241, 245, 249], fontStyle: 'bold', fontSize: 8 }` und `colSpan: 2`
- Die bestehende Reihenfolge und Logik der Datenzeilen bleibt erhalten
- Null-Zeilen werden **nicht** gefiltert

