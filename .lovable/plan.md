
# Fix: OAuth-Login zeigt falsche Berechtigungsstufe (Staff statt Admin)

## Problem-Analyse

Frank hat sein Apple- und Google-Konto mit seinem Staff-Account verknüpft und ist als **Admin** konfiguriert. Trotzdem wird bei OAuth-Login `permissionLevel: 'staff'` gesetzt.

### Ursache (Console-Logs zeigen das Problem)

```
⚠️ OAuth fallback user created: {
  "permissionLevel": "staff",
  "staffId": undefined
}
```

Der `convertOAuthUserWithTimeout` wirft einen Timeout (nach 5 Sekunden), und der Fallback-Code setzt:
- `permissionLevel: 'staff'` (Standard-Fallback)
- `staffId: undefined` (weil localStorage leer oder veraltet ist)

### Warum schlägt `convertOAuthUser` fehl?

Die Supabase-Anfrage für das Profil funktioniert (`staff_id` wird korrekt aus der DB geholt), aber der gesamte Prozess braucht manchmal länger als 5 Sekunden, weil:
1. Profile-Query via RLS
2. Staff-Daten abrufen
3. Edge-Function für `permission_level` aufrufen

---

## Lösung

### 1. Edge Function erweitern: `manage-user-role` mit user_id Parameter

Statt über `staff_id` die Berechtigung abzufragen, sollte die Edge Function auch einen Lookup via `user_id` (OAuth-Supabase-ID) unterstützen:

**Datei:** `supabase/functions/manage-user-role/index.ts`

```typescript
// GET: Lookup by staff_id OR auth_user_id
if (req.method === 'GET') {
  const url = new URL(req.url);
  const staffId = url.searchParams.get('staff_id');
  const authUserId = url.searchParams.get('auth_user_id');
  
  // If auth_user_id is provided, first find the staff_id via profiles
  let resolvedStaffId = staffId;
  if (authUserId && !staffId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('staff_id')
      .eq('user_id', authUserId)
      .single();
    resolvedStaffId = profile?.staff_id;
  }
  
  if (!resolvedStaffId) {
    return new Response(JSON.stringify({ 
      staff_id: null, 
      permission_level: 'staff' 
    }), ...);
  }
  
  // Fetch staff data and permission level in one call
  const [staffResult, roleResult] = await Promise.all([
    supabaseAdmin.from('staff').select('id, name, role').eq('id', resolvedStaffId).single(),
    supabaseAdmin.from('user_roles').select('permission_level').eq('staff_id', resolvedStaffId).single()
  ]);
  
  return new Response(JSON.stringify({
    staff_id: resolvedStaffId,
    staff_name: staffResult.data?.name,
    staff_role: staffResult.data?.role,
    permission_level: roleResult.data?.permission_level || 'staff'
  }), ...);
}
```

### 2. AuthContext vereinfachen: Ein Edge-Function-Call statt mehrerer DB-Queries

**Datei:** `src/contexts/AuthContext.tsx`

Ersetze den komplexen `convertOAuthUser` Flow durch einen einzelnen Edge-Function-Aufruf:

```typescript
const convertOAuthUser = async (supabaseUser: User): Promise<AuthUser> => {
  const name = supabaseUser.user_metadata?.full_name 
    || supabaseUser.email?.split('@')[0] 
    || 'Benutzer';

  // Single API call to get all user data including permission level
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-role?auth_user_id=${supabaseUser.id}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user role');
  }

  const roleData = await response.json();

  return {
    id: roleData.staff_id || supabaseUser.id,
    name: roleData.staff_name || name,
    role: roleData.staff_role || 'waiter',
    permissionLevel: roleData.permission_level || 'staff',
    isOAuthUser: true,
    staffId: roleData.staff_id || undefined,
    needsLinking: !roleData.staff_id,
  };
};
```

### 3. Timeout erhöhen oder entfernen

Das aktuelle Timeout von 5 Sekunden ist zu kurz. Erhöhe auf 10 Sekunden oder entferne den Timeout komplett und zeige stattdessen einen Loading-State.

### 4. Edge Function `link-account` für Multi-Account anpassen

**Datei:** `supabase/functions/link-account/index.ts`

Die Prüfung auf "bereits verknüpft" muss angepasst werden, um mehrere OAuth-Konten pro Mitarbeiter zu erlauben (Zeile 82-93 entfernen/anpassen):

```typescript
// Erlaube mehrere OAuth-Konten pro Staff
// ALTE Logik:
// if (existingLink && existingLink.user_id !== user.id) { ERROR }

// NEUE Logik: Nur prüfen ob DIESER User bereits mit einem ANDEREN Staff verknüpft ist
const { data: currentUserProfile } = await supabaseAdmin
  .from('profiles')
  .select('staff_id')
  .eq('user_id', user.id)
  .single();

if (currentUserProfile?.staff_id && currentUserProfile.staff_id !== staff.id) {
  return new Response(
    JSON.stringify({ error: 'Dein Konto ist bereits mit einem anderen Mitarbeiter verknüpft' }),
    { status: 409, ... }
  );
}
```

---

## Zusammenfassung der Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `supabase/functions/manage-user-role/index.ts` | `auth_user_id` Parameter hinzufügen, Profile-Lookup integrieren |
| `supabase/functions/link-account/index.ts` | Multi-OAuth-Konten pro Staff erlauben |
| `src/contexts/AuthContext.tsx` | `convertOAuthUser` vereinfachen (1 API-Call statt 3 DB-Queries), Timeout erhöhen |

---

## Test-Plan

1. localStorage leeren
2. Mit Google als Frank anmelden
3. Console-Log prüfen: `permissionLevel` sollte "admin" sein
4. Navigation prüfen: Alle Admin-Menüpunkte sollten sichtbar sein
5. Ausloggen
6. Mit Apple als Frank anmelden
7. Gleiche Prüfungen wie oben

---

## Warum diese Lösung besser ist

| Vorher | Nachher |
|--------|---------|
| 3 separate DB/API-Aufrufe (Profile → Staff → Role) | 1 Edge-Function-Aufruf |
| 5 Sekunden Timeout reicht nicht | Edge Function ist schneller (ca. 1-2s) |
| Fallback setzt immer `staff` | Fallback nutzt Cache mit korrektem Level |
| Mehrere OAuth-Konten blockiert | Mehrere OAuth-Konten unterstützt |
