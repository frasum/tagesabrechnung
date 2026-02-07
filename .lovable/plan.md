
# Plan: StatCards von oben in Trinkgeld Pool Card verschieben

## Übersicht

Die 4 farbigen StatCards (Kellner TG Pool, Pro Kellner, Küchen TG Pool, Trinkgeld %) werden von der oberen Position entfernt und stattdessen in die Trinkgeld Pool Card integriert - dort ersetzen sie die 3 grauen Zusammenfassungs-Kacheln.

---

## Aktueller Zustand

**Oben (wird entfernt):**
```
+------------------+------------------+------------------+------------------+
| Kellner TG Pool  | Pro Kellner (2)  | Küchen TG Pool   | Trinkgeld %      |
| 210,00 €         | 105,00 €         | 40,00 €          | 5,0 %            |
+------------------+------------------+------------------+------------------+
```

**In Trinkgeld Pool Card (3 graue Kacheln - wird ersetzt):**
```
+--------+ +----------+ +-----------+
|Kellner | |Gesamtpool| |Pro Kellner|
|   2    | | 210,00 € | | 105,00 €  |
+--------+ +----------+ +-----------+
```

---

## Gewünschter Zustand

**Oben:** Keine StatCards mehr (nur Header mit Datum)

**In Trinkgeld Pool Card:** Die 4 farbigen StatCards
```
+------------------------------------------+
| Trinkgeld Pool                           |
| Pool wird gleichmäßig verteilt           |
|                                          |
| +----------+ +----------+ +----------+ +----------+
| |Kellner   | |Pro Kellner| |Küchen TG | |Trinkgeld|
| |TG Pool   | |(2)        | |Pool      | |%        |
| |210,00 €  | |105,00 €   | |40,00 €   | |5,0 %    |
| +----------+ +----------+ +----------+ +----------+
|                                          |
| | Name | Beitrag | Anteil |              |
| | Max  | +150 €  | 105 €  |              |
| | Lisa | +60 €   | 105 €  |              |
+------------------------------------------+
```

---

## Änderungen

### Datei: `src/pages/WaiterCashUp.tsx`

**1. Obere StatCards entfernen (Zeilen 175-183):**
Das gesamte Grid mit den 4 StatCards wird entfernt:
```tsx
{waiterShifts.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard ... />
    <StatCard ... />
    <StatCard ... />
    <StatCard ... />
  </div>}
```

**2. Graue Kacheln in Trinkgeld Pool Card ersetzen (Zeilen 279-297):**
Die 3 grauen `bg-muted` Kacheln werden durch die 4 farbigen StatCards ersetzt:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <StatCard label="Kellner TG Pool" value={totalPool} icon={<Users />} variant={totalPool >= 0 ? 'success' : 'error'} />
  <StatCard label={`Pro Kellner (${waiterCount})`} value={tipPerWaiter} icon={<User />} variant={tipPerWaiter >= 0 ? 'success' : 'error'} />
  <StatCard label="Küchen TG Pool" value={totalKitchenTip} icon={<Users />} variant="success" />
  <StatCard label="Trinkgeld %" value={`${tipPercentage.toFixed(1)} %`} icon={<Percent />} variant="success" />
</div>
```

---

## Ergebnis

- Die Seite wird aufgeräumter (keine doppelten Informationen)
- Alle Trinkgeld-relevanten Zahlen sind in einer Card zusammengefasst
- Die farbigen StatCards mit Icons bleiben erhalten
- Die Tabelle mit Beitrag/Anteil pro Kellner bleibt unter den StatCards
