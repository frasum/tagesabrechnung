
# Plan: Kellner-Einträge bearbeitbar machen

## Übersicht

Klick auf eine Zeile in der Kellnerübersicht lädt die Daten zurück ins Eingabeformular. Das Formular wechselt in den "Bearbeiten-Modus" und speichert Änderungen direkt per Update.

## Benutzerablauf

1. Nutzer klickt auf eine Kellnerzeile in der Übersicht
2. Alle Werte werden ins Formular geladen
3. Formular-Titel ändert sich zu "Kellner bearbeiten"
4. Button zeigt "Aktualisieren" statt "Hinzufügen"
5. Nach dem Speichern wird das Formular zurückgesetzt

```text
┌─────────────────────────────────────────────────────────┐
│  Kellner Übersicht                                      │
├─────────────────────────────────────────────────────────┤
│  Name     │ Umsatz  │ ... │ Aktionen                    │
│───────────┼─────────┼─────┼────────────────────────────│
│  > Max    │ 500€    │ ... │ [🗑️]                        │  ← Klick lädt Max
│    Lisa   │ 420€    │ ... │ [🗑️]                        │     ins Formular
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  ✏️ Kellner bearbeiten: Max                             │
├─────────────────────────────────────────────────────────┤
│  Kellner: [Max        ▼]                                │
│  Umsatz:  [500,00€     ]  Abzugeb.: [450,00€    ]      │
│  ...                                                    │
│  [Abbrechen]              [✓ Aktualisieren]            │
└─────────────────────────────────────────────────────────┘
```

---

## Technische Umsetzung

### 1. Neuer Hook: `useUpdateWaiterShift`

**Datei:** `src/hooks/useSession.ts`

Neuer Mutation-Hook für das direkte Update eines bestehenden Kellner-Eintrags:

```typescript
export function useUpdateWaiterShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, sessionId, ...updates }) => {
      const { data, error } = await supabase
        .from('waiter_shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['waiter-shifts', data.sessionId] 
      });
    },
  });
}
```

### 2. Bearbeiten-State in der Komponente

**Datei:** `src/pages/WaiterCashUp.tsx`

Neuer State für den Bearbeiten-Modus:

```typescript
const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
```

### 3. Funktion zum Laden eines Kellners ins Formular

```typescript
const handleEditWaiter = (shift: WaiterShift) => {
  setEditingShiftId(shift.id);
  setNewWaiterName(shift.waiter_name);
  setNewPosSales(shift.pos_sales);
  setNewKassiertBrutto(shift.kassiert_brutto || 0);
  setNewCardTotal(shift.card_total);
  setNewHilfMahl(shift.hilf_mahl);
  setNewOpenInvoices(shift.open_invoices);
  setNewCashHandedIn(shift.cash_handed_in);
};
```

### 4. Angepasste Speichern-Funktion

Die `handleAddWaiter` Funktion wird erweitert, um zwischen Hinzufügen und Aktualisieren zu unterscheiden:

```typescript
const handleSaveWaiter = async () => {
  if (editingShiftId) {
    // Update existing
    await updateWaiterShift.mutateAsync({
      id: editingShiftId,
      sessionId: session.id,
      waiter_name: newWaiterName,
      pos_sales: newPosSales,
      // ... alle Felder
    });
    setEditingShiftId(null);
  } else {
    // Create new (bestehende Logik)
  }
  // Reset form
};
```

### 5. Abbrechen-Funktion

```typescript
const handleCancelEdit = () => {
  setEditingShiftId(null);
  // Reset all form fields to 0 / empty
  setNewWaiterName('');
  setNewPosSales(0);
  // ... etc.
};
```

### 6. UI-Anpassungen

**Card-Titel:** Dynamisch basierend auf Bearbeiten-Modus
```tsx
<CardTitle>
  {editingShiftId ? (
    <>
      <Pencil className="w-5 h-5" />
      Kellner bearbeiten: {newWaiterName}
    </>
  ) : (
    <>
      <User className="w-5 h-5" />
      Neuen Kellner hinzufügen
    </>
  )}
</CardTitle>
```

**Button-Bereich:** Abbrechen-Button im Bearbeiten-Modus
```tsx
<div className="flex gap-2">
  {editingShiftId && (
    <Button variant="outline" onClick={handleCancelEdit}>
      Abbrechen
    </Button>
  )}
  <Button onClick={handleSaveWaiter}>
    {editingShiftId ? 'Aktualisieren' : 'Kellner hinzufügen'}
  </Button>
</div>
```

**Tabellenzeilen:** Klickbar machen
```tsx
<TableRow 
  key={shift.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => handleEditWaiter(shift)}
>
```

### 7. Visuelles Feedback

- Aktive Zeile wird hervorgehoben wenn sie bearbeitet wird
- Cursor zeigt Pointer auf Zeilen
- Formular-Card ändert Farbe/Border im Bearbeiten-Modus

---

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/useSession.ts` | Neuer `useUpdateWaiterShift` Hook |
| `src/pages/WaiterCashUp.tsx` | Bearbeiten-State, Edit/Cancel Handler, UI-Anpassungen |

## Ergebnis

- Kellner können durch Klick auf die Zeile bearbeitet werden
- Klarer visueller Unterschied zwischen Hinzufügen und Bearbeiten
- Abbrechen-Button zum Zurücksetzen
- Daten werden direkt in der Datenbank aktualisiert (keine Duplikate)
