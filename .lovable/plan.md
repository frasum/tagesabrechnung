

## Session-Erstellung auf Manager/Admin beschraenken

### Aktuelles Verhalten

Sessions koennen derzeit von **allen Nutzern** erstellt werden -- auch von Kellnern (Staff). Das passiert an 5 Stellen:

1. **WaiterCashUp** -- "Session erstellen"-Button
2. **KitchenTipSplit** -- "Session erstellen"-Button
3. **DailySummary** -- "Session erstellen"-Button
4. **ManagerDashboard** -- "Session erstellen"-Button
5. **WaiterMobile** -- automatisch beim Speichern einer Abrechnung (wenn keine Session existiert)

### Geplante Aenderungen

**1. `src/hooks/useSession.ts` -- `useCreateSession` absichern**

Eine Berechtigungspruefung direkt in der Mutation hinzufuegen. Wenn der Nutzer weder Manager noch Admin ist, wird ein Fehler geworfen, bevor der Datenbank-Aufruf stattfindet.

**2. `src/pages/WaiterCashUp.tsx` -- Button ausblenden fuer Staff**

Der "Session erstellen"-Button wird nur fuer Manager und Admins angezeigt. Staff-Nutzer sehen stattdessen einen Hinweis wie "Keine Session fuer diesen Tag. Bitte einen Manager bitten, die Session zu erstellen."

**3. `src/pages/KitchenTipSplit.tsx` -- Button ausblenden fuer Staff**

Gleiche Logik -- der Button wird nur fuer berechtigte Nutzer angezeigt.

**4. `src/pages/DailySummary.tsx` -- Button ausblenden fuer Staff**

Gleiche Logik.

**5. `src/pages/ManagerDashboard.tsx` -- Keine Aenderung noetig**

Diese Seite ist bereits nur fuer Manager/Admin zugaenglich (via Route-Schutz).

**6. `src/pages/WaiterMobile.tsx` -- Auto-Erstellung entfernen**

Wenn ein Kellner seine Abrechnung speichert und noch keine Session existiert, wird eine Fehlermeldung angezeigt ("Keine Session fuer heute vorhanden. Bitte einen Manager bitten, die Session zu erstellen.") statt automatisch eine Session anzulegen.

### Technische Details

- Die Pruefung nutzt `hasPermission('manager')` aus dem `AuthContext`, das bereits die Hierarchie beruecksichtigt (Admin >= Manager >= Staff)
- Keine Datenbank-Aenderungen noetig -- die Einschraenkung erfolgt rein im Frontend
- Der "Session erstellen"-Button bleibt auf allen Manager/Admin-Seiten unveraendert sichtbar
