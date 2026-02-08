
# Plan: Excel-Export für Bargeldbestand

## Übersicht

Hinzufügen eines Excel-Exports mit zwei Bereichen auf einem Sheet:
1. **Tägliche Übersicht** - alle Spalten wie in der Tabelle
2. **Bankeinzahlungen** - Datum und Betrag

Der PDF-Export-Button wird durch ein Dropdown-Menü ersetzt.

## Excel-Struktur

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Bargeldbestand - Februar 2026                                               │
│ Erstellt am: 08.02.2026 14:30                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ TÄGLICHE ÜBERSICHT                                                          │
│ Datum   │ Umsatz   │ Kredit  │ OrderSm │ Wolt │ ... │ Ausgaben │ Bargeld   │
│ Sa 1.2. │ 1.234 €  │ -456 €  │ -100 €  │ -50 €│ ... │ -30 €    │ 598 €     │
│ So 2.2. │ 2.345 €  │ -567 €  │ -150 €  │ -75 €│ ... │ -45 €    │ 1.508 €   │
│ ...     │ ...      │ ...     │ ...     │ ...  │ ... │ ...      │ ...       │
│ GESAMT  │ 12.450 € │ -3.456 €│ -800 €  │ -400 €│...│ -250 €   │ 7.544 €   │
│                                                                             │
│ (Leerzeile)                                                                 │
│                                                                             │
│ BANKEINZAHLUNGEN                                                            │
│ Datum      │ Betrag                                                         │
│ 05.02.2026 │ 3.000 €                                                        │
│ 01.02.2026 │ 5.000 €                                                        │
│ Gesamt     │ 8.000 €                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## UI-Änderung

Aktuell:
```text
[PDF Export]
```

Neu:
```text
[Export ▼]
  ├─ PDF Export
  └─ Excel Export
```

## Umsetzung

### 1. Neue Abhängigkeit

```
xlsx (SheetJS)
```

Leichtgewichtige Bibliothek für Excel-Generierung im Browser.

### 2. Neue Datei erstellen

**`src/utils/excelExport.ts`**

Enthält die Funktion `generateCashBalanceExcel()`:
- Erstellt Workbook mit einem Sheet
- Fügt Titel und Erstellungsdatum hinzu
- Generiert Tägliche Übersicht mit Summenzeile
- Fügt Bankeinzahlungen mit Gesamtsumme hinzu
- Formatiert Spaltenbreiten automatisch
- Löst Download aus

### 3. Änderung an CashBalance.tsx

- Import des neuen DropdownMenu-Komponenten
- Neue `handleExcelExport`-Funktion
- Ersetzen des Buttons durch Dropdown mit PDF/Excel Optionen

## Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `package.json` | Neue Abhängigkeit `xlsx` |
| `src/utils/excelExport.ts` | Neue Datei mit Export-Logik |
| `src/pages/CashBalance.tsx` | Button → Dropdown, Excel-Handler |
