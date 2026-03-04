

## Plan: Einmaliger Mitarbeiter-Import aus thaitime

### Was passiert

Die Mitarbeiterdaten (Name, Vorname, Nachname, Perso-Nr., Stundenlohn) werden einmalig aus dem thaitime-Projekt in die Tagesabrechnung importiert. Bestehende Mitarbeiter werden per Perso-Nr. oder Name abgeglichen und aktualisiert, neue werden angelegt.

### Ablauf

1. **Edge Function erstellen** (`sync-thaitime-staff`)
   - Verbindet sich zur thaitime-Datenbank (gleiches Supabase-Projekt-Ökosystem? Nein -- verschiedene Projekte). Da die Projekte getrennte Datenbanken haben, muss die Edge Function die thaitime-Datenbank direkt via deren URL/Service-Key abfragen.
   - Liest alle aktiven Mitarbeiter aus der thaitime `employees` Tabelle (first_name, last_name, personnel_number, hourly_wage, branch_id, role)
   - Für jeden Mitarbeiter:
     - Abgleich über `perso_nr` (personnel_number) in der lokalen `staff` Tabelle
     - Falls gefunden: `first_name`, `last_name`, `hourly_rate` aktualisieren
     - Falls nicht gefunden: Neuen `staff`-Eintrag anlegen mit `name` = Vorname (als Spitzname), `first_name`, `last_name`, `perso_nr`, `hourly_rate`, `role` = 'waiter' (Standard)
   - Gibt einen Bericht zurück (aktualisiert / neu angelegt / übersprungen)

2. **Secrets konfigurieren**
   - `THAITIME_SUPABASE_URL` und `THAITIME_SERVICE_ROLE_KEY` müssen als Secrets hinterlegt werden, damit die Edge Function auf die thaitime-Datenbank zugreifen kann

3. **Import-Seite / Button**
   - Temporärer Button auf der Mitarbeiterverwaltungs-Seite (oder in den Einstellungen), der die Edge Function aufruft
   - Zeigt Ergebnis: "X aktualisiert, Y neu angelegt, Z übersprungen"
   - Kann nach erfolgreichem Import wieder entfernt werden

### Technische Details

- **Feld-Mapping thaitime → Tagesabrechnung:**

```text
thaitime.employees          →  staff (dieses Projekt)
────────────────────────────────────────────────────
personnel_number            →  perso_nr (integer)
first_name                  →  first_name
last_name                   →  last_name
first_name (fallback)       →  name (Spitzname)
hourly_wage                 →  hourly_rate
is_active                   →  is_active
```

- **Abgleich-Logik:** Primär über `perso_nr` (eindeutig). Falls keine Perso-Nr. vorhanden, Fallback auf case-insensitive Namensvergleich (first_name + last_name).
- **Restaurant-Zuordnung:** Wird nicht automatisch importiert, da die Branch-Struktur in thaitime anders ist. Muss nach dem Import manuell zugewiesen werden.
- **Edge Function nutzt Service Role Key** beider Projekte, um RLS zu umgehen.

### Nächste Schritte nach Genehmigung

1. Secrets für thaitime-Zugang anfordern
2. Edge Function implementieren
3. Import-Button auf der Mitarbeiterseite einfügen

