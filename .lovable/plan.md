
# Plan: Kumuliertes Bargeld in der GESAMT-Zeile anzeigen

## Das Problem

In der "Täglichen Bargeldübersicht" zeigt die GESAMT-Zeile nur die Summe des ausgewählten Monats (Februar: 5.608€), aber es sollte das **kumulierte Bargeld** inklusive aller vorherigen Monate (z.B. Januar + Februar) angezeigt werden.

## Die Lösung

Die letzte Spalte "Bargeld" in der GESAMT-Zeile soll den kumulierten Wert (`cumulativeCash`) anzeigen statt nur die Monatssumme.

Alternativ: Eine zusätzliche Zeile oder Beschriftung hinzufügen, die den Unterschied deutlich macht:
- Zeile 1: Monatssumme Februar
- Zeile 2: Kumuliert bis Februar (optional)

## Änderungen

**Datei: `src/pages/CashBalance.tsx`**

Die GESAMT-Zeile in der Tabelle anpassen (Zeile 359-361):

| Vorher | Nachher |
|--------|---------|
| `filteredData.reduce(...)` für Bargeld | `cumulativeCash` (bereits berechnet in Zeile 51-56) |

Die anderen Spalten (Umsatz, Kreditkarten, etc.) bleiben als Monatssummen, da diese nicht kumuliert werden müssen - nur das **Bargeld** ist der entscheidende Wert, der über die Zeit aufläuft.

## Ergebnis

```text
GESAMT | 29.600€ | -20.380€ | ... | -302€ | [Kumuliert: z.B. 8.234€]
```

Wobei das Bargeld jetzt die Summe aus Januar + Februar zeigt (nicht nur Februar).
