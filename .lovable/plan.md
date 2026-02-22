

## Fix: Abgeschnittener Text in "Differenz zum Wechselgeldbestand"

### Problem

Der Text "Differenz zum Wechselgeldbestand" ist bei fontSize 9 zu lang fuer die linke Spalte (45% Breite). Er wird abgeschnitten und die Rahmenlinien ueberlagern den Text.

### Loesung

Zwei Anpassungen in `src/utils/pdfExport.ts`:

1. **Schriftgroesse reduzieren**: Von `fontSize: 9` auf `fontSize: 7` fuer die "Differenz zum Wechselgeldbestand"-Zeile (Zeilen 198-199), damit der Text in die Spaltenbreite passt.

2. **Mehr Zellenabstand**: `cellPadding` fuer diese Zeile erhoehen (top/bottom: 1.5 statt 0.5), damit der Rahmen den Text nicht ueberlagert.

### Betroffene Stelle

| Datei | Zeilen | Aenderung |
|---|---|---|
| `src/utils/pdfExport.ts` | 197-200 | fontSize 9 -> 7, cellPadding erhoehen fuer besseren Rahmenabstand |

