
# Restaurant-Name im Mobile Header dynamisch anzeigen

## Problem
Im `MobileLayout.tsx` (Header der mobilen Kellner-Ansicht) ist der Name "Spicery" fest einprogrammiert (Zeile 22). Egal welches Restaurant per QR-Code aufgerufen wird, steht dort immer "Spicery".

## Loesung
Den `useRestaurant()`-Hook im MobileLayout verwenden, um den aktuellen Restaurant-Namen dynamisch anzuzeigen.

## Aenderung

**Datei: `src/components/layout/MobileLayout.tsx`**
- Import von `useRestaurant` aus `@/hooks/useRestaurant` hinzufuegen
- Den hardcoded String `"Spicery"` durch `restaurantName` aus dem Context ersetzen
- Fallback auf "Restaurant" falls der Name noch laedt

```typescript
// Vorher:
<span className="font-display font-semibold text-foreground">Spicery</span>

// Nachher:
const { restaurantName } = useRestaurant();
// ...
<span className="font-display font-semibold text-foreground">
  {restaurantName || 'Restaurant'}
</span>
```

Minimale Aenderung, nur eine Datei betroffen.
