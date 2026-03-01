

## Problem

In `WaiterMobile.tsx` wird beim Speichern `second_waiter_name` korrekt gesetzt, aber `additional_waiters` bleibt immer leer (`[]`).

**Create-Fall (Zeile ~119):**
```typescript
additional_waiters: [],  // ← immer leer, obwohl secondWaiterName gesetzt
```

**Update-Fall (Zeile ~112):**
```typescript
// additional_waiters wird gar nicht übergeben → wird in useWaiterShiftAudit auf [] gesetzt
```

Das gesamte System (Trinkgeld-Pool-Aufteilung, ZT-Sync, PDF-Export, Monats-Statistiken) basiert aber auf `additional_waiters`, nicht auf `second_waiter_name`. Das bedeutet:

- Der zweite Kellner wird **nicht** in der Pool-Aufteilung berücksichtigt
- Der zweite Kellner bekommt **keine** ZT-Schicht synchronisiert
- Im PDF/Excel-Export fehlt der zweite Kellner

## Loesung

**Datei: `src/pages/WaiterMobile.tsx`** — In `handleSave` das `additional_waiters`-Array aus `secondWaiterName` ableiten:

```typescript
const additionalWaiters = secondWaiterName !== 'none' ? [secondWaiterName] : [];
```

Dann bei beiden Aufrufen (create und update) `additional_waiters: additionalWaiters` mitsenden.

### Konkrete Aenderungen:

**Create-Fall (~Zeile 119-127):** `additional_waiters: []` ersetzen durch `additional_waiters: additionalWaiters`

**Update-Fall (~Zeile 112-117):** `additional_waiters: additionalWaiters` hinzufuegen

Einzeilige Ergaenzung vor den mutateAsync-Aufrufen:
```typescript
const additionalWaiters = secondWaiterName !== 'none' ? [secondWaiterName] : [];
```

### Betroffene Datei
- `src/pages/WaiterMobile.tsx`

