
# Statistiken nach Restaurant filtern

## Problem
Die drei Hooks, die Daten fuer die Statistik-Seite laden, filtern nicht nach dem aktuell ausgewaehlten Restaurant. Beim Wechsel zwischen Restaurants (z.B. Spicery / YUM) bleiben die Daten identisch, weil alle Sessions aller Restaurants geladen werden.

Betroffen sind:
- `useStatistics` -- Hauptstatistiken (Umsatz, Trinkgeld, Charts)
- `useStatisticsComparison` -- Vergleich mit Vorperiode
- `useMonthlyStaffTips` -- Monatliche Trinkgeld-Auswertung

## Loesung

### 1. `useStatistics` anpassen
- Parameter `restaurantId` hinzufuegen
- In den `queryKey` aufnehmen, damit React Query bei Restaurant-Wechsel neu laedt
- `.eq('restaurant_id', restaurantId)` zur Sessions-Abfrage hinzufuegen

### 2. `useStatisticsComparison` anpassen
- Parameter `restaurantId` an den Hook und an `fetchPeriodStats` durchreichen
- `.eq('restaurant_id', restaurantId)` zur Sessions-Abfrage hinzufuegen
- In den `queryKey` aufnehmen

### 3. `useMonthlyStaffTips` anpassen
- Parameter `restaurantId` hinzufuegen
- `.eq('restaurant_id', restaurantId)` zur Sessions-Abfrage hinzufuegen
- In den `queryKey` aufnehmen
- Query nur ausfuehren wenn `restaurantId` vorhanden (`enabled: !!restaurantId`)

### 4. `Statistics.tsx` (Seite) anpassen
- `restaurantId` aus `useRestaurant()` an alle drei Hooks weitergeben

### 5. `MonthlyTipBreakdown.tsx` (Komponente) anpassen
- `useRestaurant()` importieren und `restaurantId` an `useMonthlyStaffTips` weitergeben

## Technische Details

Alle drei Hooks erhalten `restaurantId: string | null` als Parameter. Die Supabase-Abfragen werden um `.eq('restaurant_id', restaurantId)` ergaenzt. Der `queryKey` enthaelt die `restaurantId`, sodass React Query bei jedem Restaurant-Wechsel automatisch neue Daten laedt.
