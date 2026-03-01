

## Aktuelle Woche sofort öffnen

### Problem
Beim Öffnen der Zeiterfassung gibt es eine Kaskade von asynchronen Abfragen:
1. Perioden laden → Periode auto-wählen
2. Wochen laden (abhängig von gewählter Periode) → Woche auto-wählen

Diese Kaskade verursacht eine spürbare Verzögerung, bis die aktuelle Woche angezeigt wird.

### Lösung

| Datei | Änderung |
|---|---|
| `src/contexts/ZtContext.tsx` | Wochen für alle Perioden gleichzeitig mit den Perioden laden (nicht erst nach Perioden-Auswahl). So können Periode UND Woche sofort auto-gewählt werden, ohne auf eine zweite Abfrage warten zu müssen. |

### Detail
- Die `weeks`-Query nicht mehr von `selectedPeriodId` abhängig machen, sondern alle Wochen für alle Perioden des Restaurants in einer einzigen Abfrage laden (gefiltert über die Period-IDs)
- Die Wochen-Daten dann im Context nach `selectedPeriodId` filtern, sodass `weeks` weiterhin nur die Wochen der gewählten Periode enthält
- Dadurch sind beim ersten Render beide Datensätze gleichzeitig verfügbar und Periode + Woche können im selben Render-Zyklus auto-gewählt werden
- Die Auto-Select-Effects so anpassen, dass Periode und Woche in einem Schritt gesetzt werden können

