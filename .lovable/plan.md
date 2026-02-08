
# Fix: Mehrere OAuth-Konten mit einem Mitarbeiter verknüpfen

## Problem-Analyse

Frank hat sich mit **zwei verschiedenen OAuth-Providern** angemeldet:

| Provider | E-Mail | Status |
|----------|--------|--------|
| Google | frasum@gmail.com | Verknüpft mit Frank |
| Apple | frank.schumann@me.com | Nicht verknüpft |

Die Edge Function `admin-link-account` gibt das Apple-Konto korrekt als unverknüpftes Profil zurück. Das Problem liegt im **UI-Design**:

Das aktuelle System erlaubt nur **ein** OAuth-Konto pro Mitarbeiter. Wenn bereits ein Konto verknüpft ist, zeigt die UI nur dieses mit einer "Aufheben"-Option - aber keine Möglichkeit, weitere Konten hinzuzufügen.

---

## Lösung

Es gibt zwei mögliche Ansätze:

### Option A: Mehrere OAuth-Konten pro Mitarbeiter erlauben (n:1 Beziehung)

Die Datenbank unterstützt bereits diese Beziehung (mehrere Profile können auf dieselbe `staff_id` zeigen). Die UI muss angepasst werden, um:

1. **Alle verknüpften Konten** anzuzeigen (nicht nur eines)
2. **Gleichzeitig unverknüpfte Profile** anzuzeigen, die hinzugefügt werden können

### Option B: Nur ein OAuth-Konto pro Mitarbeiter (aktuelle Logik beibehalten)

Frank muss entscheiden, ob er Google ODER Apple verwenden möchte. Das zweite Konto bleibt unverknüpft.

---

## Empfehlung: Option A implementieren

Da Frank sich mit beiden Providern anmelden möchte, sollte das System mehrere OAuth-Konten pro Mitarbeiter unterstützen.

### Änderungen

#### 1. useStaff Hook anpassen

**Datei:** `src/hooks/useStaff.ts`

Die Query für `linked_profile` muss erweitert werden, um **alle** verknüpften Profile eines Mitarbeiters zu laden, nicht nur eines.

```typescript
// Statt: linked_profile: LinkedProfile | null
// Neu: linked_profiles: LinkedProfile[]
```

#### 2. StaffDialogNative.tsx UI überarbeiten

**Datei:** `src/components/staff/StaffDialogNative.tsx`

Die Sektion "OAuth-Konto verknüpfen" anpassen:

```text
┌────────────────────────────────────────────────────────┐
│ OAuth-Konten verknüpfen                                │
├────────────────────────────────────────────────────────┤
│ Verknüpfte Konten:                                     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ✅ frasum@gmail.com (frank schumann)  [Aufheben]   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Weitere Konten verfügbar:                              │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ○ frank.schumann@me.com               [Verknüpfen] │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

#### 3. Admin-Link-Account Edge Function aktualisieren

**Datei:** `supabase/functions/admin-link-account/index.ts`

Die Prüfung entfernen, die verhindert, dass mehrere Profile mit derselben `staff_id` verknüpft werden (Zeilen 109-124).

---

## Detaillierte Code-Änderungen

### 1. Staff-Typen erweitern

In `useStaff.ts` oder einer Typdatei:

```typescript
export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
  notes: string | null;
  staff_restaurants?: { restaurant_id: string }[];
  // NEU: Array statt einzelnes Objekt
  linked_profiles?: LinkedProfile[];
}
```

### 2. useLinkedProfilesForStaff Hook erstellen

Neuer Hook, der alle verknüpften Profile für einen Mitarbeiter abruft:

```typescript
export function useLinkedProfilesForStaff(staffId: string | null) {
  return useQuery({
    queryKey: ['profiles', 'linked', staffId],
    enabled: !!staffId,
    queryFn: async () => {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-link-account?action=get-linked-for-staff&staff_id=${staffId}`,
        { headers: { ... } }
      );
      return response.json() as Promise<LinkedProfile[]>;
    },
  });
}
```

### 3. Edge Function erweitern

Neuen Query-Parameter `action=get-linked-for-staff` mit `staff_id` hinzufügen:

```typescript
if (action === 'get-linked-for-staff') {
  const staffId = url.searchParams.get('staff_id');
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, email, full_name, avatar_url, staff_id')
    .eq('staff_id', staffId)
    .order('email', { ascending: true });
  
  return new Response(JSON.stringify(data || []));
}
```

### 4. UI im Dialog anpassen

Die OAuth-Sektion in `StaffDialogNative.tsx` umbauen:

```typescript
{/* Verknüpfte Konten anzeigen */}
{linkedProfiles.length > 0 && (
  <div className="space-y-2">
    <p className="text-sm font-medium">Verknüpfte Konten:</p>
    {linkedProfiles.map((profile) => (
      <LinkedAccountCard 
        key={profile.id} 
        profile={profile} 
        onUnlink={() => handleUnlink(profile.id)} 
      />
    ))}
  </div>
)}

{/* Unverknüpfte Profile zum Hinzufügen */}
{unlinkedProfiles.length > 0 && (
  <div className="space-y-2">
    <p className="text-sm text-muted-foreground">
      Weitere Konten verfügbar:
    </p>
    {/* Radio-Liste mit Verknüpfen-Button */}
  </div>
)}
```

---

## Zusammenfassung der Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/useProfiles.ts` | Neuen `useLinkedProfilesForStaff` Hook hinzufügen |
| `supabase/functions/admin-link-account/index.ts` | `get-linked-for-staff` Endpoint hinzufügen, Mehrfach-Verknüpfung erlauben |
| `src/components/staff/StaffDialogNative.tsx` | UI erweitern, um mehrere verknüpfte Konten + unverknüpfte Profile gleichzeitig anzuzeigen |

---

## Test-Plan

1. Dialog für Frank öffnen
2. Prüfen ob das verknüpfte Google-Konto angezeigt wird
3. Prüfen ob das unverknüpfte Apple-Konto als Option zum Verknüpfen erscheint
4. Apple-Konto verknüpfen
5. Prüfen ob beide Konten nun als verknüpft angezeigt werden
6. Testen ob Frank sich sowohl mit Google als auch mit Apple anmelden kann
