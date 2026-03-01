

## Aktive Rolle bestimmt Berechtigungsstufe

### Problem
Wenn Lahm "Service" waehlt, bleibt sein `permissionLevel` auf `manager`. Dadurch sieht er das volle Manager-Dashboard statt nur die Mitarbeiterabrechnung (WaiterMobile).

### Loesung

**Datei: `src/pages/Login.tsx`** — Funktion `handleRoleSelected` (Zeile 109-124):

Wenn der Mitarbeiter "Service" oder "Kueche" waehlt (nicht GL), wird `permissionLevel` auf `staff` heruntergesetzt. Nur bei GL bleibt der Manager-Zugriff erhalten.

```typescript
const handleRoleSelected = (role: ActiveRole) => {
  const stored = localStorage.getItem('spicery_auth_user');
  if (stored) {
    const parsed = JSON.parse(stored);
    parsed.role = role === 'gl' ? 'waiter' : role;
    parsed.activeRole = role;
    // Service/Kueche = nur Staff-Berechtigung, GL = Manager behalten
    if (role !== 'gl') {
      parsed.permissionLevel = 'staff';
    }
    localStorage.setItem('spicery_auth_user', JSON.stringify(parsed));
  }
  setPendingRoleSelection(null);
  // ... navigate
};
```

Dadurch greift die `ProtectedRoute` mit `requiredLevel="manager"` und leitet Service-Nutzer auf die Mitarbeiterabrechnung um.

### Betroffene Datei
- `src/pages/Login.tsx` — nur `handleRoleSelected` anpassen (3 Zeilen hinzufuegen)

