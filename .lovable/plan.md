

## Analyse

Das Problem hat zwei moegliche Ursachen:

1. **Daten-Filterung ist korrekt** – die Netzwerkanfragen zeigen, dass bei Einzelauswahl eines Restaurants korrekt nach `restaurant_id` gefiltert wird. Moeglicherweise arbeiten die Kuechenmitarbeiter an beiden Standorten und tauchen daher in beiden auf.

2. **Fehlende visuelle Unterscheidung** – Wenn ein einzelnes Restaurant gewaehlt wird, wird `restaurantNames` als `undefined` uebergeben, daher zeigt die Tabelle keine Restaurant-Zuordnung an. Der Nutzer kann nicht erkennen, zu welchem Restaurant die Eintraege gehoeren.

## Loesung

**`restaurantNames` immer uebergeben** – nicht nur im "Alle"-Modus. Damit wird in den Tabellen von `KitchenTipChart` und `WaiterTipChart` stets die Restaurant-Gruppierung angezeigt, auch bei Einzelauswahl. So sieht der Nutzer sofort, ob die Daten tatsaechlich nur zum gewaehlten Restaurant gehoeren.

### Aenderung in `src/pages/Statistics.tsx`

Zeile 675-676 aendern:

```tsx
// Vorher:
<WaiterTipChart data={waiterTipStats} restaurantNames={isMultiMode ? restaurantNameMap : undefined} />
<KitchenTipChart data={kitchenTipStats} restaurantNames={isMultiMode ? restaurantNameMap : undefined} />

// Nachher:
<WaiterTipChart data={waiterTipStats} restaurantNames={restaurantNameMap} />
<KitchenTipChart data={kitchenTipStats} restaurantNames={restaurantNameMap} />
```

Damit werden die Eintraege immer nach Restaurant gruppiert mit Ueberschrift angezeigt – egal ob "Alle" oder ein einzelnes Restaurant gewaehlt ist. Bei Einzelauswahl erscheint dann nur eine Gruppe (das gewaehlte Restaurant), was dem Nutzer bestaetigt, dass die Filterung korrekt greift.

