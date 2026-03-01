

## Lohnbuero Portal: Restaurant-Auswahl in CumulatedView

Das Lohnbuero-Portal zeigt aktuell immer die kumulierte Ansicht aller Restaurants. Es fehlt die Moeglichkeit, zwischen einzelnen Restaurants und "Alle" zu wechseln — genau wie es jetzt im Sharing-Link (`/zt/:token`) bereits funktioniert.

### Aenderungen

| Datei | Aenderung |
|---|---|
| `supabase/functions/payroll-office-data/index.ts` | `restaurant_id` zu jedem Employee und Advance hinzufuegen. `weekToRestaurant`-Mapping (week_id → restaurant_id) und `restaurant_id` in `matchingPeriods` mitliefern. |
| `src/pages/shared/PayrollPortal.tsx` | `CumulatedView` um Restaurant-Filter erweitern: State `selectedRestaurant`, Buttons fuer jedes Restaurant + "Alle", client-seitige Filterung von Employees, Shifts, Advances, PayrollNotes (identische Logik wie in SharedZtView). |

### Details

**Edge Function**: 3 Ergaenzungen in der GET-Response:
- Employees bekommen `restaurant_id` (aus `staff_restaurants`)
- Advances bekommen `restaurant_id` (aus `sessions`)
- Neues Feld `weekToRestaurant` (week_id → restaurant_id via period)
- `matchingPeriods` bekommt `restaurant_id`

**Frontend CumulatedView**: Restaurant-Buttons zwischen Header und Tabs einfuegen. Filtering-Logik 1:1 aus SharedZtView uebernehmen (filteredEmployees, filteredShifts, filteredAdvances, filteredPayrollNotes, effectiveWeekNumberToAllIds, effectiveStatus).

