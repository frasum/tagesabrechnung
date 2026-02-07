
# Korrektur: Takeaway GL und Kreditkartenumsatz GL trennen

## Problem
Aktuell nutzen beide Felder ("Takeaway GL" unter Lieferplattformen und "Kreditkartenumsatz GL" unter POS & Terminal) dasselbe Datenbankfeld `card_total_gl`. Wenn du einen Wert in einem Feld eingibst, erscheint dieser automatisch auch im anderen Feld.

## Lösung
Das Feld "Takeaway GL" soll das bereits existierende Datenbankfeld `takeaway_total` verwenden, nicht `card_total_gl`.

## Berechnungslogik

### Kreditkartenumsatz GL (card_total_gl)
- Bleibt im Bereich "POS & Terminal"
- Wird zu den Kellner-Kartenumsätzen addiert für die Terminal-Differenz-Berechnung

### Takeaway GL (takeaway_total)
- Bleibt im Bereich "Lieferplattformen"  
- Wird nur für die Take-Away Gesamt Summe verwendet
- Hat nichts mit Kreditkartenumsätzen zu tun

### Take-Away Gesamt Berechnung (korrigiert)
```
takeaway_total + ordersmart_revenue + wolt_revenue
```
(statt aktuell: card_total_gl + ordersmart_revenue + wolt_revenue)

## Änderungen

### ManagerDashboard.tsx
1. Das CurrencyInput für "Takeaway GL" wird von `card_total_gl` auf `takeaway_total` geändert
2. Die Berechnung für "Take-Away Gesamt" wird entsprechend angepasst
