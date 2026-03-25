

## Provisions-Tab im Lohnbüro Portal

### Analyse

Das Lohnbüro-Portal hat aktuell 3 Tabs (Wochenplan, Zusammenfassung, Buchhaltung). Die Provisionsberechnung (`ZtProvision`) benötigt `waiter_shifts`-Daten (Umsatz, Stunden pro Kellner/Tag) und Staff-Rollen (um GL auszuschließen). Diese Daten werden aktuell nicht von der Edge Function `payroll-office-data` geliefert.

### Änderungen

**1. `supabase/functions/payroll-office-data/index.ts`**
- Zusätzlich `waiter_shifts` laden (mit Sessions-Join, gefiltert auf den Periodenzeitraum und die relevanten Restaurant-IDs)
- Zusätzlich `staff` (id, role, name, nickname) laden für GL-Ausschluss und Namens-Zuordnung
- Commission-Settings (`commission_min_revenue`, `commission_pct`) pro Restaurant laden
- Alles im bestehenden `Promise.all`-Block hinzufügen und in der Response zurückgeben

**2. `src/pages/shared/PayrollPortal.tsx`**
- `CumulatedData`-Typ erweitern um `waiterShifts`, `staffRoles`, `commissionSettings`
- Neuen `PayrollProvisionTab` als Komponente erstellen — read-only Version der Provisionslogik:
  - GL-Ausschluss, tägliche Aufschlüsselung, Provisions-Pool-Berechnung, Verteilung nach Stunden
  - Keine Settings-Bearbeitung (Schwellenwert/Prozentsatz nur anzeigen)
  - Verwendet `zt_shifts` aus den bereits geladenen `shifts`-Daten (Service-Department)
- 4. Tab "Provision" in `TabsList` hinzufügen (`grid-cols-3` → `grid-cols-4`)
- Restaurant-Filter auf Provision-Tab anwenden (wie bei den anderen Tabs)

### Kein Eingriff nötig bei
- Routing/Auth — das Portal ist bereits PIN-geschützt
- RLS — die Edge Function nutzt den Service Role Key
- Bestehende Tabs — keine Änderung

2 Dateien. Die Provisionslogik wird aus `ZtProvision.tsx` adaptiert, aber ohne Editier-Funktionen und ohne App-Kontext-Abhängigkeiten.

