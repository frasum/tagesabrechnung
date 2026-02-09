

# Navigation nur nach Laden der Berechtigungen anzeigen

## Problem
Wenn Gerard (Manager) eingeloggt ist, werden waehrend des Ladens seiner individuellen Navigationsberechtigungen kurzzeitig ALLE Manager-Navigationselemente angezeigt. Der Grund: Solange die `managerPaths`-Abfrage noch laeuft, ist `managerPaths = []` und `hasCustomPermissions = false`. Dadurch greift die Fallback-Logik "Manager ohne individuelle Berechtigungen sieht alles" -- und alle Menue-Eintraege werden sichtbar.

Wenn die Daten dann geladen sind, verschwinden die nicht erlaubten Eintraege. Aber bei langsamer Verbindung oder Cache-Miss bleibt die falsche Anzeige laenger sichtbar.

## Loesung
Den Ladezustand (`isLoading`) der `useManagerNavPermissions`-Query beruecksichtigen. Solange die Berechtigungen noch geladen werden, soll die Navigation nur die absoluten Kern-Elemente anzeigen (alwaysVisible) -- nicht alles.

## Technische Aenderung

### Datei: `src/components/layout/AppLayout.tsx`

1. Den `isLoading`-Status aus dem `useManagerNavPermissions`-Hook extrahieren:
```tsx
const { data: managerPaths = [], isLoading: isLoadingPermissions } = useManagerNavPermissions(
  isManager ? user?.staffId : undefined
);
```

2. In der Filter-Logik den Ladezustand beruecksichtigen -- wenn noch geladen wird, nur alwaysVisible-Pfade zeigen:
```tsx
// Manager without custom permissions loaded yet - show only core items
if (isManager && isLoadingPermissions) {
  return alwaysVisibleForManager.includes(item.path);
}

// Manager without custom permissions (fully loaded, none configured)
if (isManager) {
  return item.minLevel !== 'admin';
}
```

Damit wird verhindert, dass waehrend des Ladens alle Navigationspunkte kurz aufblitzen.

