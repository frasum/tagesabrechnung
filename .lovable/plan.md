

## Analyse: Warum der Namensabgleich überflüssig ist

Du hast vollkommen recht. Der aktuelle Ablauf ist:

1. **Kellner-Auswahl**: `StaffSelect` lädt Mitarbeiter aus der `staff`-Tabelle und gibt `staff.name` als Wert zurück
2. **Abrechnung speichern**: `waiter_shifts.waiter_name` wird als Freitext (`staff.name`) gespeichert
3. **ZT-Sync**: `syncWaiterToZt` nimmt diesen `waiter_name`-String und sucht per Namensabgleich wieder in der `staff`-Tabelle nach dem Mitarbeiter

Das ist ein Umweg — der Name kommt aus derselben Datenbank, wird aber als String gespeichert, und dann muss er wieder zurück-gemappt werden. Das ist fehleranfällig (z.B. wenn `staff.name` geändert wird nach dem Erstellen der Schicht).

## Lösung: `staff_id` direkt durchreichen

Statt den Namen als String zu matchen, sollte die `staff_id` (UUID) direkt gespeichert und für den Sync verwendet werden.

### Änderungen

1. **Datenbank-Migration**: Neue Spalte `staff_id` (uuid, nullable) auf `waiter_shifts` und `kitchen_shifts` hinzufügen
2. **StaffSelect anpassen**: Statt `staff.name` als Value die `staff.id` zurückgeben (oder beides bereitstellen)
3. **WaiterCashUp / WaiterMobile**: Beim Erstellen/Updaten einer Schicht sowohl `waiter_name` als auch `staff_id` speichern
4. **syncWaiterToZt**: Wenn `staff_id` vorhanden → direkt verwenden, kein Namensabgleich nötig. Fallback auf den bisherigen Namensabgleich für Altdaten ohne `staff_id`
5. **Gleiches für Kitchen-Sync**: `kitchen_shifts` bekommt ebenfalls `staff_id`

### Umfang der Code-Änderungen

- `supabase/migrations/` — neue Spalten `staff_id` auf `waiter_shifts` und `kitchen_shifts`
- `src/components/shared/StaffSelect.tsx` — zusätzlich `staff.id` zurückgeben (z.B. über `onStaffSelected({ id, name })` Callback)
- `src/pages/WaiterCashUp.tsx` — `staff_id` mitspeichern
- `src/pages/WaiterMobile.tsx` — `staff_id` mitspeichern
- `src/lib/syncWaiterToZt.ts` — `staff_id` als optionalen Parameter akzeptieren, bei Vorhandensein den Namensabgleich überspringen
- `src/hooks/useWaiterShiftAudit.ts` — `staff_id` an den Sync weiterreichen
- Kitchen-Tip-bezogene Seiten — analog für Küchenschichten

### Vorteile
- Kein fehleranfälliger Namensabgleich mehr
- Sync funktioniert auch nach Namensänderungen
- Abwärtskompatibel durch Fallback auf Namensabgleich

