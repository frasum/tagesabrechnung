

## Stammdaten aus Zeiterfassung importieren

### Problem
Die Mitarbeiterdaten (Vorname, Nachname, Spitzname, Personalnummer) sind im Zeiterfassung-Projekt (separate Datenbank `uahvcjqufmnsmnnoydsa`) vollstaendig gepflegt, aber in diesem Projekt (`hncirnpdfwglagjniapy`) fehlen sie bei den meisten Mitarbeitern.

Die Zeiterfassung-DB hat:
- `employees` Tabelle mit `first_name`, `last_name`, `nickname`, `perso_nr`
- `staff_mapping` Tabelle mit `tagesabrechnung_name` → `employee_id` (Zuordnung zum hiesigen `staff.name`)

### Loesung: Einmalige Edge Function fuer den Import

Eine Edge Function `sync-staff-from-zt` erstellen, die:

1. Per `fetch` die Zeiterfassung-API aufruft (URL + Anon Key sind bekannt)
2. Alle `employees` laedt
3. Alle `staff_mapping` Eintraege laedt (enthaelt `tagesabrechnung_name` → `employee_id`)
4. Fuer jeden Mapping-Eintrag: Den passenden `staff`-Datensatz in dieser DB per `name = tagesabrechnung_name` findet und mit `first_name`, `last_name`, `nickname`, `perso_nr` aktualisiert
5. Ergebnis zurueckgibt (wie viele aktualisiert, welche nicht gefunden)

### Technische Details

**Neue Datei: `supabase/functions/sync-staff-from-zt/index.ts`**

```text
Zeiterfassung-DB (uahvcjqufmnsmnnoydsa)     Dieses Projekt (hncirnpdfwglagjniapy)
┌─────────────────────┐                      ┌──────────────────┐
│ employees           │                      │ staff            │
│  id, first_name,    │──── staff_mapping    │  name,           │
│  last_name,         │    tagesabrechnung   │  first_name,     │
│  nickname, perso_nr │    _name ──────────> │  last_name,      │
└─────────────────────┘                      │  nickname,       │
                                             │  perso_nr        │
                                             └──────────────────┘
```

- Liest von der Zeiterfassung-API (oeffentlich lesbar mit Anon Key)
- Schreibt per Service-Role-Key in die lokale `staff`-Tabelle
- Einmaliger Aufruf, kann danach geloescht werden

**Frontend: Button in der Mitarbeiterverwaltung**

Ein temporaerer "Aus Zeiterfassung importieren"-Button, der die Edge Function aufruft und das Ergebnis als Toast anzeigt.

### Keine Datenbank-Aenderungen noetig
Die Spalten `first_name`, `last_name`, `nickname`, `perso_nr` existieren bereits in der `staff`-Tabelle.

