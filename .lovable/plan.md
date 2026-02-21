

## Kontroll-Abschnitt: Name des eingeloggten Benutzers anzeigen

### Problem

Im Kontroll-Abschnitt am Ende des PDF-Exports steht aktuell der Name der Person, die die Session **erstellt** hat (`createdByName`). Gewuenscht ist stattdessen der Name der Person, die **gerade eingeloggt ist** und den Export durchfuehrt.

### Aenderung

**Datei: `src/utils/pdfExport.ts`** (1 Zeile)

Im Kontroll-Abschnitt (ca. Zeile 385-386) wird `data.createdByName` durch `data.exportedBy` ersetzt:

```
Vorher:  "Abgerechnet von: {createdByName}"   (wer die Session erstellt hat)
Nachher: "Abgerechnet von: {exportedBy}"       (wer gerade eingeloggt ist)
```

Der Wert `exportedBy` wird bereits korrekt aus `user?.name` uebergeben (DailySummary.tsx, Zeile 374) — es muss nur die Referenz im PDF-Code geaendert werden.

