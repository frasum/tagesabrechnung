

# OrderSmart-in-Takeaway Toggle in den Restaurant-Einstellungen

## Uebersicht
Ein neuer Switch/Toggle wird fuer Admins hinzugefuegt, um die Einstellung `ordersmart_in_takeaway` pro Restaurant umschalten zu koennen. Die Darstellung folgt dem bestehenden Muster der `LabelSettings`-Komponente am Ende der Tagesabrechnung.

## Aenderungen

### 1. Neuer Hook in `src/hooks/useSettings.ts`
- `useOrdersmartInTakeaway(restaurantId)` hinzufuegen
- Laedt den aktuellen Wert aus der `restaurants`-Tabelle
- Bietet eine `updateOrdersmartInTakeaway`-Mutation (analog zu `useInitialCashDeficit`)

### 2. Neue Komponente `src/components/settings/OrdersmartTakeawaySetting.tsx`
- Einfache Zeile mit Label und Switch-Toggle
- Zeigt: "SoUse in Takeaway enthalten" mit einem Switch
- Nutzt `useOrdersmartInTakeaway` Hook
- Nur fuer Admins sichtbar

### 3. Integration in `src/pages/DailySummary.tsx`
- Die neue Komponente wird neben den bestehenden `LabelSettings` fuer Admins angezeigt
- Oder alternativ als eigene Card innerhalb des Admin-Bereichs

### 4. RLS-Policy fuer UPDATE
- Eine neue RLS-Policy wird benoetigt, damit die `restaurants`-Tabelle aktualisiert werden kann (aktuell ist UPDATE nicht erlaubt)
- Migration: `CREATE POLICY "Allow restaurants update via app" ON public.restaurants FOR UPDATE USING (true);`

## Technische Details

### Hook-Struktur (analog zu `useInitialCashDeficit`):
```
useOrdersmartInTakeaway(restaurantId) {
  query: SELECT ordersmart_in_takeaway FROM restaurants WHERE id = restaurantId
  mutation: UPDATE restaurants SET ordersmart_in_takeaway = value WHERE id = restaurantId
  onSuccess: invalidate restaurant queries + RestaurantContext
}
```

### Komponenten-Layout:
```
[Truck-Icon] SoUse in Takeaway enthalten  [Switch: An/Aus]
Beschreibung: Wenn deaktiviert, wird SoUse in der POS-Differenz separat abgezogen.
```

