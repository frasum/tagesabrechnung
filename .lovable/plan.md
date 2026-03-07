

# Bug: Doppelzählung von Mitarbeitern pro Tag

## Problem

Drei Stellen im Code verwenden unterschiedliche Schlüssel für denselben Mitarbeiter, was zu Doppelzählungen führt:

- Primärer Kellner: Schlüssel = `staff_id` (z.B. `0d875224-...`)
- Zweiter Kellner: Schlüssel = `second:Kriss`
- Zusätzlicher Kellner: Schlüssel = `add:Kriss`

Wenn ein Mitarbeiter in `second_waiter_name` **und** `additional_waiters` steht (das passiert häufig in den Daten, z.B. Tu am 28.02, Kriss am 06.03, ANDI am 05.03), wird er **doppelt** gezählt. Wenn er zusätzlich noch eine eigene primäre Schicht am selben Tag hat, sogar **dreifach**.

**Beispiel 28.02:** YUMMY hat `second_waiter_name: "Tu"` und `additional_waiters: ["Tu"]` → Tu wird als `second:Tu` UND `add:Tu` gezählt = 2 statt 1.

## Ursache

Das `aggregated`-Memo (Zeile 258-264) löst den Namen bereits korrekt über `staffNameToId` auf und verwendet `sid || \`secondary:${name}\`` als einheitlichen Schlüssel. Aber die beiden anderen Memos (`sessionCount/staffDays` und `dailyBreakdown`) verwenden noch die getrennten Präfixe `second:` und `add:`.

## Lösung

In `sessionCount/staffDays` und `dailyBreakdown` dieselbe Logik wie in `aggregated` verwenden: Sekundäre/zusätzliche Kellner über `staffNameToId` auflösen und den aufgelösten `staff_id` (oder als Fallback einen einheitlichen Schlüssel `secondary:${name}`) als Key verwenden.

### Änderungen in `ZtProvision.tsx`

**1. `sessionCount/staffDays` Memo (Zeilen 283-294):**

Statt `second:${name}` und `add:${name}` → aufgelösten staff_id oder `secondary:${name}` verwenden:

```typescript
if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
  const sid = staffNameToId.get(ws.second_waiter_name.toLowerCase());
  dateStaffMap.get(date)!.add(sid || `secondary:${ws.second_waiter_name}`);
}
if (ws.additional_waiters?.length) {
  for (const aw of ws.additional_waiters) {
    if (aw && !isGlByName(aw)) {
      const sid = staffNameToId.get(aw.toLowerCase());
      dateStaffMap.get(date)!.add(sid || `secondary:${aw}`);
    }
  }
}
```

Dependency-Array um `staffNameToId` ergänzen.

**2. `dailyBreakdown` Memo (Zeilen 319-339):**

Gleiche Anpassung – einheitlicher Schlüssel statt `second:`/`add:`-Präfixe:

```typescript
if (ws.second_waiter_name && !isGlByName(ws.second_waiter_name)) {
  const sid = staffNameToId.get(ws.second_waiter_name.toLowerCase());
  const sKey = sid || `secondary:${ws.second_waiter_name}`;
  if (!day.staffSet.has(sKey)) {
    day.staffSet.add(sKey);
    day.nameSet.add(ws.second_waiter_name);
  }
  if (sid) day.staffIdsOnDate.add(sid);
}
if (ws.additional_waiters?.length) {
  for (const aw of ws.additional_waiters) {
    if (aw && !isGlByName(aw)) {
      const awSid = staffNameToId.get(aw.toLowerCase());
      const aKey = awSid || `secondary:${aw}`;
      if (!day.staffSet.has(aKey)) {
        day.staffSet.add(aKey);
        day.nameSet.add(aw);
      }
      if (awSid) day.staffIdsOnDate.add(awSid);
    }
  }
}
```

Damit wird jeder Mitarbeiter pro Tag genau einmal gezählt, egal ob er als primärer, zweiter oder zusätzlicher Kellner eingetragen ist.

