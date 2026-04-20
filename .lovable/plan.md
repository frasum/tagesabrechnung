

# Gesamtsumme zwischen „Übertrag aus Vormonat" und „Bankeinzahlungen" anzeigen

## Ziel
Eine neue Kennzahl **„Gesamt verfügbar"** zwischen „Übertrag aus Vormonat" und „Bankeinzahlungen" einfügen, die die Summe aus Monatsbargeld + Übertrag aus Vormonat zeigt.

## Änderungen
**Datei:** `src/components/cash-balance/CashBalanceSummary.tsx`

1. Grid von `sm:grid-cols-3` auf `sm:grid-cols-4` erweitern.
2. Neue Spalte zwischen „Übertrag aus Vormonat" und „Bankeinzahlungen" einfügen:
   - Label: **„Gesamt verfügbar"**
   - Wert: `totalCash + carryOverFromPreviousMonth`
   - Farbe: grün wenn ≥ 0, rot wenn negativ
   - Mit `+` Präfix bei positiven Werten für Konsistenz

## Beispiel
Bei aktuellem Stand (Bargeld im April + 866 € Übertrag) zeigt die neue Zelle die Gesamtsumme an, die vor Bankeinzahlungen verfügbar ist.

## Keine weiteren Änderungen
- Keine DB-Änderung
- Keine Logikänderung der bestehenden Werte

