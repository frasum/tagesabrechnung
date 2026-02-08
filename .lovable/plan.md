
## Manager-Navigationsberechtigungen verwalten

### Übersicht
Ein neuer Navigationspunkt "Berechtigungen" wird hinzugefügt, über den Admins festlegen können, welche Navigationselemente einzelne Manager sehen dürfen. Dies ermöglicht eine granulare Kontrolle über den Funktionszugang für jeden Manager.

### Datenbankstruktur

| Tabelle | Beschreibung |
|---------|-------------|
| `manager_nav_permissions` | Speichert pro Manager, welche Navigationspfade erlaubt sind |

```text
┌────────────────────────────────────┐
│     manager_nav_permissions        │
├────────────────────────────────────┤
│ id (uuid, PK)                      │
│ staff_id (uuid, FK → staff.id)     │
│ nav_path (text)                    │ ← z.B. "manager", "kitchen", "statistics"
│ created_at (timestamptz)           │
│ updated_at (timestamptz)           │
└────────────────────────────────────┘
```

**Logik**: Wenn ein Manager **keinen Eintrag** in dieser Tabelle hat, sieht er **alle Manager-Bereiche** (Rückwärtskompatibilität). Sobald mindestens ein Eintrag existiert, sieht er **nur die zugewiesenen Bereiche**.

### Neue Seite: Berechtigungsverwaltung

| Datei | Beschreibung |
|-------|-------------|
| `src/pages/PermissionManagement.tsx` | Neue Admin-Seite zur Verwaltung |

**Benutzeroberfläche:**

```text
┌──────────────────────────────────────────────────────────────┐
│  🔐 Berechtigungen verwalten                                 │
│  Manager-Navigationszugriff konfigurieren                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  👤 Max Mustermann (Manager)                            │ │
│  │  ─────────────────────────────────────────────          │ │
│  │  ☑ Manager Dashboard                                    │ │
│  │  ☑ Küchen Trinkgeld                                     │ │
│  │  ☐ Tagesabrechnung                                      │ │
│  │  ☑ Statistiken                                          │ │
│  │  ☐ Verlauf                                              │ │
│  │  ☐ Bargeldbestand                                       │ │
│  │  [Speichern]                                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  👤 Anna Schmidt (Manager)                              │ │
│  │  ─────────────────────────────────────────────          │ │
│  │  ☑ Manager Dashboard                                    │ │
│  │  ☑ Küchen Trinkgeld                                     │ │
│  │  ☑ Tagesabrechnung                                      │ │
│  │  ☑ Statistiken                                          │ │
│  │  ☑ Verlauf                                              │ │
│  │  ☑ Bargeldbestand                                       │ │
│  │  [Speichern]                                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Navigation-Integration

| Datei | Änderung |
|-------|----------|
| `src/components/layout/AppLayout.tsx` | Navigationsfilterung basierend auf `manager_nav_permissions` |
| `src/types/permissions.ts` | Neue Konstante für konfigurierbare Manager-Bereiche |

**Ablauf:**
1. Beim Laden der App werden die Manager-Berechtigungen geladen
2. Die Navigation filtert basierend auf:
   - `staff` → sieht nur Kellner-Abrechnung
   - `manager` → sieht zugewiesene Bereiche (oder alle, wenn keine Einschränkungen)
   - `admin` → sieht alles + "Berechtigungen" Seite

### Neue/Geänderte Dateien

| Datei | Aktion |
|-------|--------|
| `src/pages/PermissionManagement.tsx` | **Neu** - Admin-Seite für Berechtigungsverwaltung |
| `src/hooks/useManagerNavPermissions.ts` | **Neu** - Hook zum Laden/Speichern der Berechtigungen |
| `src/components/layout/AppLayout.tsx` | **Ändern** - Navigation anpassen mit Berechtigungsfilter |
| `src/types/permissions.ts` | **Ändern** - Konstante für Manager-Bereiche hinzufügen |
| `src/App.tsx` | **Ändern** - Route für `/permissions` hinzufügen |
| `supabase/functions/manage-nav-permissions/index.ts` | **Neu** - Edge Function für CRUD |

### Sicherheit
- Nur Admins können die Berechtigungsseite sehen und bearbeiten
- RLS-Policies schützen die neue Tabelle
- Edge Function mit Service Role Key für administrative Operationen

---

### Technische Details

**Datenbank-Migration:**
```sql
CREATE TABLE manager_nav_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  nav_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, nav_path)
);

ALTER TABLE manager_nav_permissions ENABLE ROW LEVEL SECURITY;

-- Read via app (for navigation filtering)
CREATE POLICY "Allow nav permissions read via app"
  ON manager_nav_permissions FOR SELECT USING (true);

-- Insert/Update/Delete via service role only
CREATE POLICY "Allow nav permissions insert via service"
  ON manager_nav_permissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow nav permissions update via service"
  ON manager_nav_permissions FOR UPDATE USING (true);

CREATE POLICY "Allow nav permissions delete via service"
  ON manager_nav_permissions FOR DELETE USING (true);
```

**Edge Function API:**
- `GET /manage-nav-permissions?staff_id=xxx` → Liefert alle erlaubten Pfade
- `POST /manage-nav-permissions` → Setzt Berechtigungen (überschreibt bestehende)

**Hook `useManagerNavPermissions`:**
- Lädt Berechtigungen für alle Manager (Admin-Ansicht)
- Lädt Berechtigungen für aktuellen User (Navigation)
- Mutation zum Speichern

**Navigationsfilterung in AppLayout:**
```typescript
// Wenn Manager und Berechtigungen existieren:
const managerPaths = user?.navPermissions || [];
const hasCustomPermissions = managerPaths.length > 0;

const navItems = allNavItems.filter(item => {
  if (userLevel === 'admin') return true;
  if (userLevel === 'manager') {
    if (!hasCustomPermissions) return item.minLevel !== 'admin';
    return managerPaths.includes(item.path);
  }
  return item.minLevel === 'staff';
});
```
