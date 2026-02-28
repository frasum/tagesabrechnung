

## Plan: Stammdaten-Felder zum Mitarbeiter-Dialog hinzufügen

Die Felder `first_name`, `last_name`, `nickname` und `perso_nr` existieren bereits in der `staff`-Tabelle. Sie müssen nur im Dialog und im `StaffInput`-Interface ergänzt werden.

### Änderungen

1. **`src/hooks/useStaff.ts`**
   - `Staff`-Interface: `first_name`, `last_name`, `nickname`, `perso_nr` hinzufügen (alle optional)
   - `StaffInput`-Interface: dieselben 4 Felder hinzufügen (alle optional)

2. **`src/components/staff/StaffDialogNative.tsx`**
   - 4 neue State-Variablen: `firstName`, `lastName`, `nickname`, `persoNr`
   - Initialisierung im `useEffect` aus `staff.first_name` etc.
   - Neue Eingabefelder nach dem bestehenden "Name"-Feld einfügen:
     - Nachname (text)
     - Vorname (text)
     - Spitzname (text)
     - Personalnummer (number)
   - `handleSubmit`: Die 4 neuen Felder an `onSave` übergeben

### Keine Datenbankänderungen nötig
Alle Spalten existieren bereits in der `staff`-Tabelle.

