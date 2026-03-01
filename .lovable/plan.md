

## Paginierung für die History-Seite

### Änderungen

**1. `src/hooks/useSession.ts` — `useSessionHistory` erweitern**
- Neuen Parameter `page` (default 0) hinzufügen
- Query mit `.range(page * 30, (page + 1) * 30 - 1)` statt `.limit(30)`
- Zusätzlich `count: 'exact'` in der Query für Gesamtanzahl
- Rückgabewert: `{ sessions, totalCount }`
- QueryKey enthält `page` für Cache-Trennung

**2. `src/pages/History.tsx` — Paginierungs-UI**
- `page` State (default 0) hinzufügen
- `totalCount` aus dem Hook auslesen, `totalPages` berechnen
- Unter der Tabelle Paginierung-Buttons mit Vor/Zurück und Seitenzahlen anzeigen (shadcn Pagination-Komponenten sind bereits vorhanden)
- `totalSessions` aus `totalCount` statt `sessions.length` berechnen (für die Statistik-Karte oben)

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/useSession.ts` | `useSessionHistory` mit `page`-Parameter und `count: 'exact'` |
| `src/pages/History.tsx` | Page-State, Paginierungs-UI unter Tabelle |

