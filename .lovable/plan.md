

## Fix: `is_holiday` wird fälschlicherweise auch für Sonntage gesetzt

### Problem

Das Feld `is_holiday` in `zt_shifts` soll nur `true` sein, wenn der Tag ein **bayerischer Feiertag** ist — NICHT wenn es ein Sonntag ist. Downstream in `ZtBruttoNetto.tsx` wird `is_holiday` verwendet, um zwischen Sonntag (50%) und Feiertag (125%) zu unterscheiden. Aktuell wird `is_holiday` auf `isSundayOrHoliday` gesetzt, wodurch Sonntagsstunden fälschlich den 125%-Feiertagszuschlag bekommen statt 50%.

### Betroffene Stellen

| Datei | Zeile | Bug |
|-------|-------|-----|
| `src/lib/syncWaiterToZt.ts` | 107 | `is_holiday: params.isSundayOrHoliday` → sollte separate `isHoliday`-Flag sein |
| `src/components/zeiterfassung/ShiftTimeOverride.tsx` | 232, 462, 483 | `is_holiday: isSundayOrHoliday` → sollte `holidaySet.has(date)` sein |

`ZtWochenplan.tsx` ist korrekt — nutzt bereits `holidays?.has(date)`.

### Lösung

**`syncWaiterToZt.ts`**:
- `upsertZtShift` bekommt einen neuen Parameter `isHoliday: boolean` (nur Feiertag, nicht Sonntag)
- `is_holiday` wird auf `params.isHoliday` gesetzt statt `params.isSundayOrHoliday`
- Aufrufer übergeben `isHoliday` separat vom `isSundayOrHoliday`

**`ShiftTimeOverride.tsx`**:
- `is_holiday` wird auf `holidaySet.has(date)` gesetzt statt `isSundayOrHoliday`

### Auswirkung

Bestehende Schichtdaten, die an Sonntagen fälschlich `is_holiday = true` haben, müssten ggf. korrigiert werden. Neue Syncs und Batch-Updates werden korrekt gespeichert.

