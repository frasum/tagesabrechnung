

# Mitarbeiter über alle Restaurants kumulieren

## Problem

Die Deduplizierung verwendet den Key `restaurant_id::staff_id`. Ein Mitarbeiter, der in 2 Restaurants arbeitet (z.B. Spicery + YUM), erscheint als **2 separate Zeilen** — die Schichten werden dabei sogar doppelt gezählt, weil die Shift-Query nicht nach Restaurant filtert.

## Lösung

Den Dedup-Key auf `staff_id` allein ändern. Restaurant-Namen und Abteilungen werden zusammengeführt (z.B. "Spicery, YUM" / "Service, Küche"). Der höchste Stundenlohn wird verwendet.

### Konkrete Änderungen in `BatchPayrollCalculation.tsx`

1. **Dedup-Key ändern**: Von `${sr.restaurant_id}::${sr.staff_id}` auf `sr.staff_id`
2. **Restaurant-Namen mergen**: Wenn ein Mitarbeiter in mehreren Restaurants ist, alle Namen komma-separiert anzeigen
3. **Abteilungen mergen**: Wie bisher, aber auch über Restaurants hinweg
4. **Restaurant-ID**: Erste Restaurant-ID behalten (für eventuelle Verlinkung)
5. **Stundenlohn**: Höchsten Wert verwenden (wie bisher)

### Betroffene Datei

| Datei | Änderung |
|---|---|
| `src/components/zeiterfassung/BatchPayrollCalculation.tsx` | Dedup-Key auf `staff_id` ändern, Restaurant-Namen zusammenführen |

