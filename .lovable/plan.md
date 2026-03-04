

## Plan: Einmaliger Mitarbeiter-Import aus thaitime (aktualisiert)

### Übersicht

Die thaitime-App stellt bereits eine Edge Function `sync-employees` bereit, die alle Mitarbeiterdaten als JSON liefert. Dieses Projekt muss nur noch eine eigene Edge Function erstellen, die diese Daten abruft und in die lokale `staff`-Tabelle importiert.

### Datenformat von thaitime

Die API liefert pro Mitarbeiter:
```text
{ thaitime_id, perso_nr, first_name, last_name, name (Spitzname), hourly_rate, is_active, branch_id }
```

### Umsetzung

**1. Secret konfigurieren**
- `THAITIME_SYNC_API_KEY` — derselbe Key, der im thaitime-Projekt als `SYNC_API_KEY` hinterlegt ist

**2. Edge Function `sync-thaitime-staff`**
- Ruft `https://dqxyyfxcwuxtzyhxlfyo.supabase.co/functions/v1/sync-employees` mit dem API-Key auf
- Für jeden Mitarbeiter aus der Antwort:
  - Abgleich über `perso_nr` in der lokalen `staff`-Tabelle
  - Falls gefunden → `first_name`, `last_name`, `hourly_rate`, `name` aktualisieren
  - Falls nicht gefunden → neuen Eintrag anlegen (`name`, `first_name`, `last_name`, `perso_nr`, `hourly_rate`, `role = 'waiter'`, `is_active`)
- Gibt Bericht zurück: `{ updated: X, created: Y, skipped: Z }`
- Authentifizierung: Admin-Check über `x-staff-id` Header (bestehendes Muster)

**3. Import-Button auf der Mitarbeiterseite**
- Button "Import aus thaitime" in der StaffManagement-Seite
- Ruft die Edge Function auf, zeigt Toast mit Ergebnis
- Kann nach erfolgreichem Import entfernt werden

### Sicherheit
- Server-zu-Server-Aufruf, API-Key nie im Frontend exponiert
- Admin-Berechtigung wird serverseitig geprüft

