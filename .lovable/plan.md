

# Fix: Frank sieht nicht die vollständige Navigation trotz Admin-Berechtigung

## Problem-Analyse

Frank ist in der Datenbank als **Admin** konfiguriert, aber die Navigation zeigt nur Menüpunkte für **Staff**-Level.

### Ursache

1. **OAuth-Fallback setzt falschen permissionLevel**: Bei Timeout oder Fehler beim Abruf der Berechtigungen wird `permissionLevel: 'staff'` gesetzt
2. **Cached User wird nicht korrekt aktualisiert**: Der localStorage-Wert wird bei erneutem Login nicht zwingend aktualisiert
3. **linkAccount() aktualisiert permissionLevel nicht**: Die Funktion setzt nur `staffId`, `name`, `role` - aber ignoriert `permissionLevel`

### Datenbank-Status (verifiziert)
```
staff.name = 'Frank'
staff.id = '8e83c717-8339-4efb-b792-9024f2cf409d'
user_roles.permission_level = 'admin'
profiles.user_id = 'd218aca2-aef3-454b-a7c7-ba3d062a10d5' (frasum@gmail.com)
profiles.staff_id = '8e83c717-8339-4efb-b792-9024f2cf409d'
```

Die Edge Function `manage-user-role` gibt korrekt `permission_level: 'admin'` zurück, wenn die richtige `staff_id` verwendet wird.

---

## Lösung

### 1. linkAccount() muss auch permissionLevel abrufen

**Datei:** `src/contexts/AuthContext.tsx`

Wenn ein OAuth-Benutzer mit einem Staff-Account verknüpft wird, muss die Berechtigung ebenfalls abgerufen werden:

```typescript
const linkAccount = async (staff: { id: string; name: string; role: string }) => {
  if (user) {
    // Fetch permission level for the linked staff
    let permissionLevel: PermissionLevel = 'staff';
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${staff.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (response.ok) {
        const roleData = await response.json();
        permissionLevel = roleData.permission_level || 'staff';
      }
    } catch (e) {
      console.error('Failed to fetch permission level during linking:', e);
    }

    const updatedUser: AuthUser = {
      ...user,
      id: staff.id,
      name: staff.name,
      role: staff.role as 'waiter' | 'kitchen',
      permissionLevel, // Jetzt wird permissionLevel korrekt gesetzt
      staffId: staff.id,
      needsLinking: false,
    };
    setUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  }
};
```

### 2. Fallback-User muss versuchen, permissionLevel aus Cache zu übernehmen

**Datei:** `src/contexts/AuthContext.tsx`

Im `onAuthStateChange`-Handler beim Fallback:

```typescript
} catch (error) {
  console.error('OAuth sign-in processing failed:', error);
  // Try to get cached permission level
  const cachedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  let cachedPermissionLevel: PermissionLevel = 'staff';
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      cachedPermissionLevel = parsed.permissionLevel || 'staff';
    } catch {}
  }
  
  const fallbackUser: AuthUser = {
    id: session.user.id,
    name,
    role: 'waiter',
    permissionLevel: cachedPermissionLevel, // Behalte cached Level
    isOAuthUser: true,
    needsLinking: true,
  };
  setUser(fallbackUser);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackUser));
}
```

### 3. Button zum manuellen Refresh der Berechtigungen (optional, für Debugging)

Füge eine Möglichkeit hinzu, die Berechtigungen manuell zu aktualisieren, falls der automatische Abruf fehlschlägt:

**Neue Funktion in AuthContext:**

```typescript
const refreshPermissions = async () => {
  if (!user?.staffId) return;
  
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?staff_id=${user.staffId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      }
    );
    if (response.ok) {
      const roleData = await response.json();
      const updatedUser = { ...user, permissionLevel: roleData.permission_level || 'staff' };
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  } catch (e) {
    console.error('Failed to refresh permissions:', e);
  }
};
```

---

## Änderungen im Detail

| Datei | Änderung |
|-------|----------|
| `src/contexts/AuthContext.tsx` | `linkAccount()` um permissionLevel-Abruf erweitern |
| `src/contexts/AuthContext.tsx` | Fallback-User soll cached permissionLevel übernehmen |
| `src/contexts/AuthContext.tsx` | (Optional) `refreshPermissions()` Funktion hinzufügen |

---

## Test-Plan

1. **localStorage leeren** (um mit sauberer Session zu starten)
2. **Mit Google als Frank anmelden**
3. **Prüfen ob Navigation alle Admin-Menüpunkte zeigt**:
   - Kellner Abrechnung
   - Manager Dashboard
   - Küchen Trinkgeld
   - Tagesabrechnung
   - Statistiken
   - Verlauf
   - Bargeldbestand
   - Mitarbeiter (nur für Admin sichtbar)

---

## Technische Details

### Aktueller fehlerhafter Flow
```
OAuth Login → convertOAuthUser() timeout → Fallback mit permissionLevel='staff' → localStorage speichert falschen Wert → Navigation zeigt nur Staff-Menüpunkte
```

### Korrigierter Flow
```
OAuth Login → convertOAuthUser() erfolgt oder Fallback mit cached permissionLevel → Bei Account-Linking wird permissionLevel erneut abgerufen → Navigation zeigt korrekte Menüpunkte
```

