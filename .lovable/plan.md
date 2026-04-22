

# Aktualisierungs-Problem auf anderen Geräten beheben

## Warum siehst du auf einem anderen Computer eine alte Version?

Zwei Gründe wirken zusammen:

1. **Frontend ist nicht neu „published"**: In Lovable werden Frontend-Änderungen erst durch Klick auf **Publish → Update** auf der Live-URL (`tagesabrechnung.lovable.app`) aktiv. Solange du nicht erneut publishst, sehen andere Computer weiterhin die letzte veröffentlichte Version — egal wie viele Änderungen du im Editor gemacht hast.
2. **PWA Service-Worker-Cache**: Die App ist als PWA mit `registerType: "autoUpdate"` konfiguriert. Der Service Worker liefert beim ersten Aufruf die gecachte alte `index.html`/JS-Bundle aus und prüft erst **im Hintergrund** auf Updates. Erst beim **nächsten** Reload sieht der Nutzer die neue Version. Auf einem anderen Computer, der die App schon einmal geöffnet hat, wirkt das wie „bleibt alt".

Zusätzlich bremsen:
- **Browser HTTP-Cache** für `index.html`
- **Bereits installierte PWA**: Service-Worker-Update-Check passiert nur alle 5 Minuten (siehe `UpdateNotification.tsx`)

## Sofort-Maßnahmen (kein Code nötig)

1. **Publish → Update** in Lovable klicken (oben rechts) — sonst ist deine neueste Version gar nicht live.
2. Auf dem anderen Computer:
   - **Hard Reload**: Cmd/Ctrl + Shift + R
   - Oder DevTools → Application → Service Workers → „Unregister" + Storage → „Clear site data"

## Code-Verbesserungen, damit das künftig automatisch klappt

### 1. Sichtbares Update-Banner mit „Jetzt neu laden"-Button
In `src/components/pwa/UpdateNotification.tsx` ist aktuell nur ein Banner **nach** erfolgtem Update sichtbar. Wir ergänzen:
- Hook in `useRegisterSW` auf `onNeedRefresh` → Banner mit Button **„Neue Version verfügbar — Jetzt aktualisieren"** anzeigen, der `updateServiceWorker(true)` aufruft (sofort reload).
- So merken Nutzer auf jedem Gerät sofort, dass es ein Update gibt, und können mit einem Klick laden.

### 2. Update-Intervall verkürzen
- Polling von **5 min → 60 Sekunden** in `UpdateNotification.tsx` (Zeile mit `setInterval(..., 5 * 60 * 1000)`).
- Zusätzlich Update-Check beim **Tab-Fokus** (`visibilitychange` → `registration.update()`), damit Rückkehr zum Tab sofort nach neuer Version sucht.

### 3. `index.html` nicht aggressiv cachen
- Workbox-Konfiguration in `vite.config.ts` um `runtimeCaching` für `navigation`-Requests mit `NetworkFirst` (kurzer Timeout, Fallback auf Cache) erweitern → `index.html` wird bevorzugt frisch geladen, App startet aber offline weiterhin.

### 4. Versions-Anzeige (optional, sehr hilfreich)
- Build-Zeitstempel als `import.meta.env`-Konstante in `vite.config.ts` definieren (`define: { __BUILD_TIME__: ... }`).
- Klein in der Sidebar/Footer anzeigen: „v 2026-04-22 15:30" — so siehst du auf jedem Gerät auf einen Blick, ob es die aktuelle Version ist.

## Betroffene Dateien
- `vite.config.ts` — `navigateFallback`-Caching + `__BUILD_TIME__` define
- `src/components/pwa/UpdateNotification.tsx` — `onNeedRefresh`-Banner, kürzeres Polling, visibility-Handler
- `src/components/layout/AppLayout.tsx` (oder Sidebar-Footer) — kleine Versions-Anzeige

## Nicht betroffen
- Datenmodell, Auth, Berechnungslogik

## Erwartetes Ergebnis
- Andere Computer holen sich neue Versionen **innerhalb von 1 Minute** (statt frühestens nach 5 Min + Reload).
- Nutzer sehen ein klares Banner „Neue Version — Jetzt aktualisieren" und können mit einem Klick laden.
- Versions-Stempel erlaubt schnelle Diagnose, ob Gerät die aktuelle Version hat.
- **Wichtig vorab**: Der Effekt tritt nur ein, **nachdem du einmalig auf Publish → Update geklickt hast** — sonst lebt der andere Computer weiterhin von der alten Live-Version.

