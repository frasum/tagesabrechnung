
# Kellner immer auf die mobile Ansicht weiterleiten

## Problem
Die Weiterleitung nach dem Login in `RestaurantSelect.tsx` basiert auf der Bildschirmbreite (`useIsMobile`). Kellner mit groesseren Handys oder Tablets (>= 768px) werden faelschlicherweise auf die Desktop-Ansicht (`WaiterCashUp`) weitergeleitet. Ausserdem hat die Index-Route keine Berechtigungsbeschraenkung, sodass `staff`-Nutzer die Desktop-Ansicht sehen koennen.

## Loesung

### 1. RestaurantSelect.tsx - Weiterleitung nach Rolle statt nur Bildschirmbreite

Die Weiterleitung wird um die Berechtigungsstufe des Nutzers erweitert:
- **staff**: Immer auf `/:slug/waiter` (egal welche Bildschirmgroesse)
- **manager/admin**: Wie bisher basierend auf `isMobile`

```
Aktuell:  navigate(isMobile ? `/${slug}/waiter` : `/${slug}`)
Neu:      navigate(isStaff || isMobile ? `/${slug}/waiter` : `/${slug}`)
```

Betroffen sind drei Stellen in der Datei (Zeilen 39, 49, 61).

### 2. Index-Route absichern (optional, empfohlen)

In `RestaurantRoutes` in `App.tsx` (Zeile 41) die Index-Route mit `requiredLevel="manager"` schuetzen, damit ein `staff`-Nutzer, der manuell `/:restaurant/` aufruft, automatisch zurueckgeleitet wird.

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/pages/RestaurantSelect.tsx` | `user.permissionLevel` pruefen: Staff-Nutzer immer auf `/waiter` weiterleiten |
| `src/App.tsx` | Index-Route (Zeile 41) mit `requiredLevel="manager"` absichern |
