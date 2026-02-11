
# Gasteanzahl und Durchschnittsverzehr

## Was sich aendert

Unterhalb des "Transaktionen"-Feldes (pos_total) im UMSATZ-Bereich wird ein neues Eingabefeld "Gaesteanzahl" hinzugefuegt. Daneben wird automatisch der Durchschnittsverzehr pro Gast berechnet und angezeigt (pos_total / Gaesteanzahl).

## Beispiel

```
UMSATZ
Transaktionen          [3.475,20 €]
Gaesteanzahl           [  142  ]    ⌀ 24,47 € / Gast
```

## Technische Umsetzung

### 1. Datenbank-Migration

Neue Spalte `guest_count` (integer, nullable, default 0) in der `sessions`-Tabelle.

### 2. ExcelLayout erweitern

- Neues Prop `guestCount` und `onGuestCountChange` in `ExcelLayoutProps`
- Unterhalb der `pos_total`-Zeile im UMSATZ-Bereich: eine neue Zeile mit einem Integer-Eingabefeld (kein Waehrungsformat) und rechts daneben den berechneten Durchschnitt (`pos_total / guest_count`), sofern `guest_count > 0`

### 3. DailySummary anpassen

- `guest_count` in `formData` aufnehmen (Default: 0)
- Sync mit Session-Daten
- Auto-Save wie bei allen anderen Feldern
- Wert als Props an `ExcelLayout` weitergeben

### 4. Dateien

| Datei | Aenderung |
|-------|-----------|
| Migration (SQL) | `ALTER TABLE sessions ADD COLUMN guest_count integer DEFAULT 0` |
| `src/components/daily-summary/layouts/ExcelLayout.tsx` | Neue Zeile mit Gaesteanzahl-Input + Durchschnitt |
| `src/pages/DailySummary.tsx` | `guest_count` in formData, sync, auto-save |
