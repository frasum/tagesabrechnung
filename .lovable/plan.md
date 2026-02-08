
# Berechtigungssystem für Mitarbeiter

## Übersicht

Implementierung eines 3-stufigen Rollen-Systems:

| Rolle | Zugriff | Typische Aufgaben |
|-------|---------|-------------------|
| **staff** | Nur eigene Abrechnung | Kellner-Abrechnung einreichen |
| **manager** | Operatives Management | Dashboard, Trinkgeld, Statistiken, Tagesabrechnung |
| **admin** | Vollzugriff | + Mitarbeiterverwaltung, Systemeinstellungen |

---

## Navigationsstruktur nach Rolle

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      NAVIGATION NACH ROLLE                           │
├────────────────────┬─────────────────┬─────────────────┬─────────────┤
│ Menüpunkt          │ staff           │ manager         │ admin       │
├────────────────────┼─────────────────┼─────────────────┼─────────────┤
│ Kellner Abrechnung │ ✅ (nur eigene) │ ✅              │ ✅          │
│ Manager Dashboard  │ ❌              │ ✅              │ ✅          │
│ Küchen Trinkgeld   │ ❌              │ ✅              │ ✅          │
│ Tagesabrechnung    │ ❌              │ ✅              │ ✅          │
│ Statistiken        │ ❌              │ ✅              │ ✅          │
│ Verlauf            │ ❌              │ ✅              │ ✅          │
│ Bargeldbestand     │ ❌              │ ✅              │ ✅          │
│ Mitarbeiter        │ ❌              │ ❌              │ ✅          │
└────────────────────┴─────────────────┴─────────────────┴─────────────┘
```

---

## Technische Implementierung

### 1. Datenbank-Änderungen

#### Neue Tabelle: `user_roles`
Gemäß Best Practice wird die Rolle in einer separaten Tabelle gespeichert (nicht in `staff` oder `profiles`):

```sql
-- Enum für App-Rollen
CREATE TYPE public.app_permission_level AS ENUM ('staff', 'manager', 'admin');

-- Rollen-Tabelle
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  permission_level app_permission_level NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id)
);

-- RLS aktivieren
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

#### Security Definer Function
```sql
CREATE OR REPLACE FUNCTION public.get_staff_permission(p_staff_id UUID)
RETURNS app_permission_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permission_level FROM user_roles WHERE staff_id = p_staff_id),
    'staff'::app_permission_level
  )
$$;
```

### 2. Edge Function: `get-user-role`

Neue Edge Function, die beim Login die Berechtigungsstufe zurückgibt:

```typescript
// GET /functions/v1/get-user-role?staff_id=xxx
// Gibt: { permission_level: 'staff' | 'manager' | 'admin' }
```

### 3. AuthContext erweitern

```typescript
interface AuthUser {
  id: string;
  name: string;
  role: 'waiter' | 'kitchen';  // Job-Rolle (bleibt)
  permissionLevel: 'staff' | 'manager' | 'admin';  // NEU: Berechtigungsstufe
  // ...
}
```

### 4. Navigation filtern

```typescript
// AppLayout.tsx
const getVisibleNavItems = (permissionLevel: string) => {
  const allItems = [
    { path: '', label: 'Kellner Abrechnung', minLevel: 'staff' },
    { path: 'manager', label: 'Manager Dashboard', minLevel: 'manager' },
    { path: 'kitchen', label: 'Küchen Trinkgeld', minLevel: 'manager' },
    // ...
  ];
  
  return allItems.filter(item => 
    hasPermission(permissionLevel, item.minLevel)
  );
};
```

### 5. ProtectedRoute erweitern

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLevel?: 'staff' | 'manager' | 'admin';
}

// Prüft ob User mindestens das erforderliche Level hat
```

---

## Dateien, die geändert werden

| Datei | Änderung |
|-------|----------|
| `supabase/migrations/...` | Neue Tabelle `user_roles` + Funktion |
| `supabase/functions/get-user-role/index.ts` | Neue Edge Function |
| `supabase/functions/validate-pin/index.ts` | Rolle mit zurückgeben |
| `src/contexts/AuthContext.tsx` | `permissionLevel` hinzufügen |
| `src/components/auth/ProtectedRoute.tsx` | Level-Prüfung |
| `src/components/layout/AppLayout.tsx` | Navigation filtern |
| `src/hooks/useUserRole.ts` | Neuer Hook |
| `src/components/staff/StaffDialogNative.tsx` | Berechtigungsstufe auswählen |
| `src/pages/StaffManagement.tsx` | Nur für Admins sichtbar |

---

## UI: Berechtigungsstufe im Mitarbeiter-Dialog

```text
┌─────────────────────────────────────────────────┐
│ Mitarbeiter bearbeiten                          │
├─────────────────────────────────────────────────┤
│ Name: [Frank                            ]       │
│ Rolle: [○ Kellner  ● Küche             ]       │
│                                                 │
│ ─────────────────────────────────────────────   │
│ Berechtigungsstufe:                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ ○ Mitarbeiter                               │ │
│ │   Nur eigene Abrechnung einsehen            │ │
│ │ ○ Manager                                   │ │
│ │   Dashboard, Statistiken, Trinkgeld         │ │
│ │ ● Admin                                     │ │
│ │   Vollzugriff inkl. Mitarbeiterverwaltung   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                    [Abbrechen] [Speichern]      │
└─────────────────────────────────────────────────┘
```

---

## Sicherheitsaspekte

1. **Rollen in separater Tabelle**: Verhindert Privilege Escalation
2. **Security Definer Function**: Umgeht RLS sicher für Rollenabfrage
3. **Serverseitige Validierung**: Edge Functions prüfen Berechtigung
4. **Kein Client-seitiges Trust**: Berechtigungen werden bei jedem Request geprüft

---

## Migrations-Strategie

Für bestehende Mitarbeiter wird standardmäßig `staff` als Berechtigungsstufe gesetzt. Du als Admin kannst dann im Mitarbeiter-Dialog die Berechtigungen anpassen.
