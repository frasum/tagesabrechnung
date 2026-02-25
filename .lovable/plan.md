

# Trinkgeld-Prozent auf Gesamtumsatz beziehen (ohne Küchenabzug)

## Was sich ändert

Aktuell wird das **TG %** berechnet als Pool-Anteil (nach Küchenabzug) geteilt durch den Umsatz. Der Nutzer möchte stattdessen:

1. **TG % = Gesamt-Trinkgeld (vor Küchenabzug) / POS-Umsatz** -- damit man sieht, wie viel Trinkgeld der Mitarbeiter insgesamt erwirtschaftet hat
2. **Bei Teamschichten (2 Mitarbeiter):** Jeder bekommt denselben TG%-Wert wie ein Solo-Mitarbeiter -- die volle Schicht-Performance wird beiden zugerechnet, damit die Entwicklung vergleichbar bleibt

## Betroffene Dateien und Änderungen

### 1. `src/pages/WaiterCashUp.tsx` (Tagesansicht -- TG % Spalte)

Aktuelle Berechnung (Zeile 456-461):
```
shiftTipShare = tipPerWaiter (Pool-Anteil nach Küche)
currentTipPercent = shiftTipShare / personalSalesShare * 100
```

Neue Berechnung:
```
totalTipBeforeKitchen = cash_handed_in - expected  (ohne Küchenabzug)
currentTipPercent = totalTipBeforeKitchen / pos_sales * 100
```

Bei Teamschichten: Beide Mitarbeiter erhalten denselben `currentTipPercent` (den vollen Schichtwert, nicht halbiert).

### 2. `src/hooks/useWaiterRanking.ts` (Ranking -- Ø TG %)

Aktuelle Berechnung (Zeile 75-79):
```
individualTip = cash_handed_in - expected - kitchen_tip
```

Neue Berechnung:
```
individualTip = cash_handed_in - expected  (ohne kitchen_tip Abzug)
```

Bei Teamschichten: Beide Mitarbeiter bekommen denselben TG%-Wert der vollen Schicht (pos_sales nicht aufteilen, Tip nicht aufteilen).

### 3. `src/hooks/useSession.ts` (`useWaiterTipAverages` -- Ø TG % pro Mitarbeiter)

Aktuelle Berechnung (Zeile 459-461):
```
contribution = cash_handed_in - expected - kitchen_tip
sessionPool = Summe aller contributions
```

Neue Berechnung:
- `contribution = cash_handed_in - expected` (ohne kitchen_tip)
- Bei Teamschichten: Jeder Mitarbeiter bekommt den vollen `tipPercent` der Schicht (pos_sales wird nicht geteilt, Trinkgeld wird nicht geteilt)
- Der Durchschnitt aggregiert diese Werte pro Mitarbeiter über alle Schichten

### 4. `src/pages/WaiterMobile.tsx` (Waiter Self-Service)

Die dortige Berechnung von `currentTip` und `currentTipPercent` zeigt bereits das Trinkgeld vor Küchenabzug -- hier wird nur die Darstellung angepasst, um `kitchenTip` nicht mehr abzuziehen.

## Zusammenfassung der Logik

```text
Vorher:  TG% = (Bargeld - Soll - Küche) / Umsatz
Nachher: TG% = (Bargeld - Soll) / Umsatz

Vorher (Team):  Jeder bekommt Pool-Anteil / eigener Umsatzanteil
Nachher (Team): Jeder bekommt vollen Schicht-TG% (gleiche Berechnung wie Solo)
```

