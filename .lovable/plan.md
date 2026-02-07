
# Plan: Button zum Löschen aller Sessions mit Bestätigungswort

## Übersicht
Ein Button "Alle Sessions löschen" wird auf der Verlaufsseite hinzugefügt. Um die Aktion auszuführen, muss der Nutzer das Wort **"LÖSCHEN"** in ein Eingabefeld eintippen. Erst wenn das Wort korrekt eingegeben wurde, wird der Button zum Bestätigen aktiviert.

## Funktionsweise

```text
┌────────────────────────────────────────┐
│         Alle Sessions löschen?         │
├────────────────────────────────────────┤
│                                        │
│  ⚠️ Diese Aktion kann nicht rückgängig │
│  gemacht werden! Es werden X Sessions  │
│  unwiderruflich gelöscht.              │
│                                        │
│  Tippe "LÖSCHEN" ein, um zu bestätigen:│
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Abbrechen]     [Endgültig löschen]   │
│                     (deaktiviert)      │
└────────────────────────────────────────┘
```

- Der "Endgültig löschen"-Button bleibt deaktiviert, bis exakt "LÖSCHEN" eingegeben wurde
- Großschreibung wird ignoriert (löschen, Löschen, LÖSCHEN funktionieren alle)
- Nach erfolgreichem Löschen erscheint eine Erfolgsmeldung

## Änderungen

### 1. Neue Mutation in useSession Hook
Hinzufügen einer `useDeleteAllSessions` Mutation, die:
- Alle zugehörigen Daten löscht (waiter_shifts, kitchen_shifts, card_transactions, expenses)
- Dann alle Sessions löscht
- Die Query-Caches invalidiert

### 2. UI-Änderungen auf der History-Seite
- Roter "Alle löschen"-Button unter der Überschrift
- AlertDialog mit Warnhinweis und Eingabefeld
- Validierung der Eingabe bevor Löschung möglich ist
- Toast-Benachrichtigung nach erfolgreichem Löschen

---

## Technische Details

### Datei: src/hooks/useSession.ts
Neue Export-Funktion:
```typescript
export function useDeleteAllSessions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Erst alle abhängigen Tabellen leeren
      await supabase.from('card_transactions').delete().neq('id', '');
      await supabase.from('expenses').delete().neq('id', '');
      await supabase.from('kitchen_shifts').delete().neq('id', '');
      await supabase.from('waiter_shifts').delete().neq('id', '');
      // Dann Sessions
      const { error } = await supabase.from('sessions').delete().neq('id', '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-history'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
```

### Datei: src/pages/History.tsx
Änderungen:
1. Import des AlertDialog und der neuen Mutation
2. State für Dialog-Öffnung und Eingabetext
3. Button unter der Überschrift
4. AlertDialog mit Eingabefeld und Validierung
5. Toast für Erfolgs-/Fehlermeldung
