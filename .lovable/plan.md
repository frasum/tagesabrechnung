

# Zweiten Kellner im Self-Service (Mobile) hinzufuegen

## Ziel

Im mobilen Self-Service (`/waiter`) soll ein Kellner optional einen zweiten Kellner auswaehlen koennen, wenn sie zusammen an einer Station arbeiten. Das entspricht der Funktionalitaet, die im Manager-Bereich (`WaiterCashUp`) bereits existiert.

## Aenderungen

### Datei: `src/pages/WaiterMobile.tsx`

1. **SecondWaiterSelect importieren** (`src/components/shared/SecondWaiterSelect.tsx`) -- diese Komponente existiert bereits und wird im Manager-Bereich genutzt.

2. **Neuen State hinzufuegen**: `secondWaiterName` mit Standardwert `"none"`.

3. **Formular erweitern**: Zwischen dem Kellner-Header und den Eingabefeldern ein `SecondWaiterSelect`-Dropdown einfuegen mit:
   - `excludeWaiter={staffName}` -- damit der eingeloggte Kellner sich nicht selbst als zweiten Kellner waehlen kann
   - `restaurantId={restaurantId}` -- damit nur Kellner des aktuellen Restaurants angezeigt werden
   - Label: "Zweiter Kellner (optional)"

4. **Speichern-Logik anpassen**:
   - Bei `createWaiterShift`: `second_waiter_name` auf den gewaehlten Wert setzen (oder `null` wenn `"none"`)
   - Bei `updateWaiterShift`: `second_waiter_name` ebenfalls mitsenden

5. **Bestehende Daten laden**: Wenn `myShift` geladen wird und bereits ein `second_waiter_name` hat, diesen Wert in den State uebernehmen.

## Technische Details

- Die `SecondWaiterSelect`-Komponente normalisiert `"none"` bereits intern nicht -- das passiert in `useCreateWaiterShift` (Zeile 96), wo `"none"` zu `null` konvertiert wird. Das gleiche gilt fuer `useUpdateWaiterShift`.
- Keine Datenbank-Aenderungen noetig -- `second_waiter_name` existiert bereits in der `waiter_shifts`-Tabelle.
- Kein neuer Hook noetig -- die bestehenden Hooks unterstuetzen `second_waiter_name` bereits.

