
# Nur Excel-Layout behalten -- alle anderen entfernen

## Was passiert

Der Layout-Umschalter und die vier nicht genutzten Layouts (Horizontal, Sektionen, Zwei-Spalten, Tabelle) werden komplett aus dem System entfernt. Das Excel-Layout wird direkt gerendert, ohne Auswahl-Option.

## Betroffene Dateien

### Loeschen (6 Dateien)
- `src/components/daily-summary/LayoutSwitcher.tsx`
- `src/components/daily-summary/layouts/HorizontalLayout.tsx`
- `src/components/daily-summary/layouts/SectionsLayout.tsx`
- `src/components/daily-summary/layouts/ColumnsLayout.tsx`
- `src/components/daily-summary/layouts/TableLayout.tsx`
- `src/components/daily-summary/layouts/index.ts`

### Anpassen
- **`src/pages/DailySummary.tsx`**:
  - Import des `LayoutSwitcher` und aller Layouts ausser `ExcelLayout` entfernen
  - `ExcelLayout` direkt aus der Datei importieren
  - `layoutMode`-State, `handleLayoutChange`, `LAYOUT_STORAGE_KEY` und `renderLayout()`-Switch entfernen
  - Den `LayoutSwitcher` aus dem Header entfernen
  - Das `ExcelLayout` direkt rendern (ohne Switch-Case)
  - Die nicht mehr benoetigten `layoutProps` (die nur fuer die anderen Layouts gebraucht wurden) aufraeumen

## Ergebnis
- Weniger Code, weniger Komplexitaet
- Das Excel-Layout wird immer direkt angezeigt
- Kein Layout-Umschalter mehr im Header
