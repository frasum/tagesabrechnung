## Ziel
Verhindern, dass die Sidebar beim Login (besonders nach PIN- oder OAuth-Login) kurzzeitig nur die "staff"-Einträge zeigt und Admin-/Manager-Punkte wie **Zeiterfassung** erst nach 1–2 Sekunden erscheinen.

## Ursache
1. `AuthContext` setzt sofort den **gecachten** Benutzer aus `localStorage` (oft mit veralteter `permissionLevel`) und stößt parallel einen Hintergrund-Refresh an.
2. `AppLayout` rendert die Navigation sofort mit diesem gecachten Wert → falsche Einträge bis der Refresh durch ist.
3. Für Manager kommt dazu: `useManagerNavPermissions` lädt asynchron — während `isLoadingPermissions=true` zeigt der bestehende Code nur den Pfad `''` (Mitarbeiter-Abrechnung).

## Änderungen

### 1. `src/contexts/AuthContext.tsx` — Sync-Status erweitern
- Neuer State `isSyncingPermissions: boolean` (zusätzlich zum bestehenden `isLoading`).
- Wird beim Mount auf `true` gesetzt, sobald ein gecachter PIN-User existiert und der Background-Refresh startet.
- Wird auf `false` gesetzt:
  - nach erfolgreichem Refresh (egal ob `permissionLevel` gleich blieb oder sich geänderte hat),
  - im `catch`-Zweig (Netzwerkfehler → wir akzeptieren den Cache),
  - direkt `false`, wenn kein `staffId` vorhanden ist oder der User per OAuth/Login frisch eingeloggt ist (dort liefert `convertOAuthUserWithTimeout` bereits live-Daten).
- Über den Context-Value zusätzlich exportieren: `isSyncingPermissions`.

### 2. `src/components/layout/AppLayout.tsx` — Render-Gate
- `isSyncingPermissions` und `isLoading` aus `useAuth()` ziehen.
- Neue abgeleitete Variable `isAuthReady = !isLoading && !isSyncingPermissions`.
- Für **Manager** zusätzlich: solange `useManagerNavPermissions` lädt (`isLoadingPermissions`) ebenfalls als nicht bereit behandeln (Manager-spezifisch — Admins müssen darauf nicht warten).
- Solange `!isAuthReady`:
  - Desktop: Sidebar-Skelett rendern (Logo + Restaurant-Switcher + 6 graue `Skeleton`-Zeilen via `@/components/ui/skeleton`), Navigation-Items werden **nicht** gerendert. Höhe & Breite bleiben gleich, damit kein Layout-Shift entsteht.
  - Mobile: Hamburger-Menü zeigt beim Öffnen ebenfalls Skeleton-Zeilen statt der Items.
- Hauptinhalt (`<main>`) wird wie bisher gerendert — nur die Navigation wartet.

### 3. `src/pages/zeiterfassung/ZtLayout.tsx` (analoges Mini-Fix)
- Tab-Leiste prüft bereits Manager-Permissions. Auch hier: solange Manager-Permissions laden, statt der Tabs einen schmalen Skeleton-Streifen rendern, damit der Tab "Zusammenfassung" nicht kurz alleine erscheint.

## Was sich für den Benutzer ändert
- Beim ersten Frame nach Login/Reload erscheint **kurz ein Skeleton** in der Sidebar, danach erscheinen alle korrekten Einträge auf einmal.
- Kein "Zeiterfassung-Eintrag fehlt" mehr für Admins, deren Cache veraltet war.
- Maximale Wartezeit ist identisch zur bisherigen (gleiche Netzwerk-Calls), nur das Rendering wird zurückgehalten.

## Out of scope
- Keine Änderung an Edge Functions oder DB.
- Keine Änderung der Permissions-Logik selbst — nur das Render-Timing.
- `useUserRole`/`useManagerNavPermissions` bleiben unverändert.
