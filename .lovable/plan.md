

## Plan: Cross-Restaurant Conflict Warning in Dienstplan Grid

### Problem
Currently, `useShiftAssignments` only fetches shifts for the **current restaurant**. If a staff member is already scheduled at another location on the same day, there's no visual indication.

### Approach

**1. New hook: `useConflictingShifts`** (in `useDienstplan.ts`)
- Query `shift_assignments` for the given staff IDs and date range, but **exclude** the current `restaurant_id`
- Returns a Set-like structure: `Map<string, string>` keyed by `staffId-date` → restaurant name

**2. Join with restaurant name**
- Select `shift_assignments` joined with `restaurants.name` where `restaurant_id != currentRestaurantId`

**3. Pass conflict info to `ShiftCell`**
- Add optional `conflictRestaurant?: string` prop to `ShiftCell`
- In `MonthlyGrid`, build a conflict lookup from the new query and pass it per cell

**4. Visual warning in `ShiftCell`**
- When `conflictRestaurant` is set, show an orange/amber border or background tint with a tooltip-style indicator (e.g., small ⚠ icon or colored left border)
- Show the other restaurant name on hover via `title` attribute (lightweight, no extra dependency)

### Files to Change

| File | Change |
|---|---|
| `src/hooks/useDienstplan.ts` | Add `useConflictingShifts(restaurantId, staffIds, startDate, endDate)` query |
| `src/components/dienstplan/MonthlyGrid.tsx` | Call new hook, build conflict map, pass `conflictRestaurant` to `ShiftCell` |
| `src/components/dienstplan/ShiftCell.tsx` | Add `conflictRestaurant` prop, render amber warning styling + title tooltip |

### Visual Design
- Cell gets an amber/orange left border (`border-l-2 border-l-amber-500`) when conflict exists
- Small ⚠ indicator in top-right corner of cell
- Native `title` attribute shows: "Bereits eingeteilt bei [Restaurant]"

