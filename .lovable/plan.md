

## Problem

"Tu" und "ANDI" haben keine eigenen `waiter_shifts`-Einträge — sie tauchen nur als Namen im `additional_waiters`-Array anderer Kellner-Schichten auf. Da `additional_waiters` nur ein Text-Array ist ohne eigene `hours_worked`, werden ihnen 0 Stunden zugeordnet.

Beispieldaten März 2026:
- Jasmin (6.43 Std.) → additional_waiters: ["Tu"]
- Pim (6.57 Std.) → additional_waiters: ["Tu"]  
- YUMMY (7.15 Std.) → additional_waiters: ["ANDI"]

Tu und ANDI haben gearbeitet, aber ihre Stunden stehen nur auf der Hauptschicht.

## Lösung

**Die Stunden der Hauptschicht dem zusätzlichen Mitarbeiter zurechnen**, da sie dieselbe Schicht gearbeitet haben.

### Änderung in `src/hooks/useMonthlyStaffTips.ts`

In der `additional_waiters`-Verarbeitung (Zeilen 144-152) die `hours_worked` des primären Kellners auch dem zusätzlichen Kellner zuordnen:

```typescript
// Zeile 143-152: Additional waiters
const additionalWaiters: string[] = (ws as any).additional_waiters || [];
for (const name of additionalWaiters) {
  const normalizedName = name.toLowerCase().trim();
  const aKey = nameToStaffId[normalizedName] || normalizedName;
  if (!waiterTipsMap[aKey]) {
    waiterTipsMap[aKey] = { tip: 0, hours: 0, displayName: name };
  }
  waiterTipsMap[aKey].tip += tipPerWaiter;
  waiterTipsMap[aKey].hours += waiterHours;  // ← NEU: gleiche Stunden wie Hauptkellner
}
```

```text
Vorher:  Tu → { tip: 302, hours: 0.0 }   (nur TG aus additional_waiters, keine Stunden)
Nachher: Tu → { tip: 302, hours: ~19.7 }  (Stunden der jeweiligen Hauptschichten übernommen)
```

Eine minimale Änderung — nur eine Zeile hinzufügen.

