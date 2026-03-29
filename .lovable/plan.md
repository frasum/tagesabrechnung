

# Schreibschutz: Admin UND Manager können entsperren

## Konzept

Die bestehende Sperrlogik wird erweitert: Vergangene Tagesabrechnungen sind automatisch schreibgeschützt. Sowohl **Admins als auch Manager** können den Schreibschutz aufheben.

## Änderungen

### 1. DB-Migration — neue Spalten in `sessions`
- `is_unlocked` (boolean, DEFAULT `false`) — manuelles Entsperr-Flag
- `unlocked_at` (timestamptz, nullable)
- `unlocked_by_name` (text, nullable)

### 2. Sperrlogik (`src/utils/businessDate.ts`)

`isSessionLocked` wird vereinfacht — kein Rollen-Check mehr, nur zeitbasiert + Override:

```typescript
export function isSessionLocked(sessionDate: Date, isUnlocked: boolean = false): boolean {
  if (isUnlocked) return false;
  const today = getBusinessDate();
  return format(sessionDate, 'yyyy-MM-dd') < format(today, 'yyyy-MM-dd');
}
```

### 3. `SessionLockedBanner.tsx` erweitern

- Props: `permissionLevel`, `onUnlock`, `onLock`, `isUnlocked`
- **Admin und Manager** sehen den Button "Zur Bearbeitung freigeben"
- Wenn entsperrt: anderer Banner mit "Wieder sperren"-Button

### 4. Alle 3 Seiten anpassen

`DailySummary.tsx`, `WaiterCashUp.tsx`, `KitchenTipSplit.tsx`:
- Session-Daten laden inkl. `is_unlocked`
- `isSessionLocked(selectedDate, session?.is_unlocked)` aufrufen
- Unlock/Lock-Handlers: `supabase.from('sessions').update(...)` mit `is_unlocked`, `unlocked_at`, `unlocked_by_name`
- Audit-Log-Eintrag bei jeder Entsperrung/Sperrung

### Betroffene Dateien
- **Migration**: 1 neue Migration (3 Spalten in `sessions`)
- `src/utils/businessDate.ts` — Signatur + Logik ändern
- `src/components/shared/SessionLockedBanner.tsx` — Unlock/Lock-Buttons für Admin+Manager
- `src/pages/DailySummary.tsx` — Lock-Check + Handler
- `src/pages/WaiterCashUp.tsx` — Lock-Check + Handler
- `src/pages/KitchenTipSplit.tsx` — Lock-Check + Handler

