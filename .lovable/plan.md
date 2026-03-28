

# Vorzeichen (-/+) aus der Bargeldbestand-Tabelle entfernen

## Problem
Die roten Spalten zeigen ein `-` und die grüne Spalte ein `+` vor den Beträgen. Da die Farbe (rot/grün) bereits die Richtung signalisiert, sind die Vorzeichen redundant und machen die Tabelle unübersichtlicher.

## Lösung

### `src/pages/CashBalance.tsx`
Alle manuell vorangestellten `-` und `+` Zeichen entfernen — sowohl in den **Tabellenzeilen** (Zeilen ~298–329) als auch in den **Footer-Summen** (Zeilen ~357–388):

- `-{formatCurrency(row.kreditkarten)}` → `{formatCurrency(row.kreditkarten)}`
- `+{formatCurrency(row.gutscheineVK)}` → `{formatCurrency(row.gutscheineVK)}`
- Analog für alle anderen Spalten mit Vorzeichen (ordersmart, wolt, gutscheineEL, finedine, einladung, offeneRE, vorschuss, ausgaben)

Betrifft ca. 20 Stellen (10 Tabellenzeilen + 10 Footer-Zeilen). Keine Logik-Änderung, rein kosmetisch.

