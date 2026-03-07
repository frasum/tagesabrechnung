

## Problem

Die Statistik-Seite nutzt `restaurantId` aus dem URL-/Navigationskontext als Fallback (Zeile 124: `selectedRestaurantId || restaurantId`). Wenn im Statistik-Tab z.B. "YUM" gewählt wird, aber in der Navigation "Spicery" aktiv ist, kann es zu Konflikten kommen.

## Lösung

Den Fallback auf `restaurantId` aus der Navigation entfernen. Stattdessen soll der `statsMode` beim Laden der Seite auf das erste verfügbare Restaurant oder `'all'` initialisiert werden – unabhängig davon, welches Restaurant in der Navigation gewählt ist.

### Änderungen in `src/pages/Statistics.tsx`

1. **Fallback entfernen** – Zeile 124 und 129: `restaurantId` nicht mehr als Fallback verwenden:
   ```tsx
   // Vorher:
   isMultiMode ? undefined : (selectedRestaurantId || restaurantId)
   // Nachher:
   isMultiMode ? undefined : selectedRestaurantId
   ```

2. **Default-Initialisierung anpassen** – `statsMode` startet bereits mit `'all'` (Zeile 97), was korrekt ist. Die Tabs (Zeile 224) setzen den Modus direkt auf die Restaurant-ID. Damit ist die Statistik-Auswahl vollständig unabhängig von der Navigation.

3. **Labels-Hook** – Zeile 141 (`useLabels(restaurantId)`) ebenfalls auf `selectedRestaurantId` umstellen, damit Labels zum gewählten Statistik-Restaurant passen.

