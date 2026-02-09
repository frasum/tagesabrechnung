

# Plan: PDF-Export an Excel-Struktur anpassen

## Ziel

Den PDF-Export so umbauen, dass er die einfache Tabellenstruktur aus dem ersten Bild widerspiegelt. Die detaillierte Kellner-Tabelle, der Trinkgeld-Pool und die Küchenpersonal-Aufschlüsselung (zweites Bild) werden entfernt.

## Gewünschte PDF-Struktur (nach erstem Bild)

```text
┌──────────────────────────────┬────────────────────────────────┐
│ Umsatz              7168,70 │ trinkgeld p.p         113,00  │
│ KK                  6472,13 │ service                        │
│ OrderSmart             22,29│                                │
│ Wolt                  308,40│                                │
│ Gutscheine              0,00│                                │
│ FineDine              100,00│                                │
│ Gutscheine VK           0,00│                                │
│ Offen                   0,00│                                │
│ Personal                0,00│                                │
│ einladung               0,00│                                │
│ Bar Ausgaben            0,00│                                │
│ HilfMahl                0,00│                                │
│                              │                                │
│ Bargeld mit HilfMahl  265,88│ ohne hilfmahl    265,88       │
└──────────────────────────────┴────────────────────────────────┘
```

## Aenderungen in `src/utils/pdfExport.ts`

### Entfernen
- Rechte Spalte: Kellner-Tabelle (horizontal, Zeilen 284-341)
- Rechte Spalte: Trinkgeld Pool (Zeilen 344-380)
- Rechte Spalte: Kuechenpersonal (Zeilen 382-402)
- Linke Spalte: Die gruppierten Unter-Tabellen (Umsatz, Kredit Karten, Take Away, Gutscheine)

### Neu aufbauen
- **Eine einzige flache Tabelle** mit allen Zeilen wie im Excel:
  - Umsatz (pos_total)
  - KK (Terminal 1 + Terminal 2)
  - OrderSmart
  - Wolt
  - Gutscheine (eingeloest)
  - FineDine
  - Gutscheine VK
  - Offen (offene Rechnungen)
  - Personal (Vorschuss)
  - einladung
  - Bar Ausgaben
  - HilfMahl
  - Leerzeile
  - **Bargeld mit HilfMahl** (fett, hervorgehoben)

- **Daneben rechts**: Kleiner Block mit "trinkgeld p.p" und dem Betrag pro Kellner

### Beibehalten
- Header (Titel, Datum, Restaurant)
- Warnungen (POS/Terminal Differenz)
- Ausgaben-Liste (falls vorhanden, unterhalb)
- Footer (Seitenzahlen)

## Technische Details

- Orientierung bleibt Landscape (oder wechselt zu Portrait, da weniger Spalten)
- Die Haupttabelle wird als einzelne `autoTable` mit `theme: 'plain'` erstellt
- Rechts daneben ein kleiner Text-Block fuer Trinkgeld p.p.
- BARGELD-Zeile bekommt Hintergrundfarbe und fette Schrift

## Dateiaenderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/utils/pdfExport.ts` | Bearbeiten | `generateDailySummaryPDF` komplett umstrukturieren auf flache Tabelle |

