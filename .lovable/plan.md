

## Analyse: Warum Lam am 26.2. blockiert ist

### Datenlage
Lam hat am 26.02. in der Spicery **zwei** Einträge (gleiche `week_id`):
- **Service**: 16:00–23:45 (7.75h) — vom Kellner-Sync automatisch erstellt
- **GL**: leer (0h, keine Zeiten) — leere Zeile

Die Konflikt-Logik prüft `s.department !== dept || s.week_id !== selectedWeekId`. Wenn man die GL-Zeile betrachtet, findet sie den Service-Eintrag mit anderem Department → Konflikt. Und umgekehrt.

### Problem
Lam ist innerhalb desselben Restaurants (Spicery) sowohl GL als auch Service zugewiesen. Das ist gewollt — der Unique Constraint erlaubt `(employee_id, shift_date, department)`. Die Konfliktprüfung blockiert aber **alles**, auch innerhalb desselben Restaurants.

### Lösung
Die Konfliktprüfung soll nur greifen, wenn die Schicht in einem **anderen Restaurant** (= anderer `week_id`) existiert. Innerhalb desselben Restaurants (gleiche `week_id`) sind mehrere Departments erlaubt.

### Änderung in `src/pages/zeiterfassung/ZtWochenplan.tsx`

**`getConflict`-Funktion anpassen:**
```typescript
// ALT (blockiert auch innerhalb des gleichen Restaurants):
(s.department !== dept || s.week_id !== selectedWeekId)

// NEU (blockiert nur bei anderem Restaurant):
s.week_id !== selectedWeekId
```

So kann ein Mitarbeiter am selben Tag in mehreren Departments desselben Restaurants arbeiten (GL + Service), wird aber blockiert wenn er in einem anderen Restaurant bereits eingetragen ist.

**Gleiche Anpassung in `upsertShift`-Mutation** (Validierung vor dem Speichern) und in `syncWaiterToZt.ts` / `ShiftTimeOverride.tsx`.

