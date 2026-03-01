

## Einmaliger Import der Zeiterfassungs-Schichtdaten für März

### Ansatz
Eine temporäre Edge Function wird erstellt, die sich mit dem externen Zeiterfassungs-Backend verbindet, die März-Schichtdaten ausliest, und per `perso_nr`-Abgleich in die lokale `zt_shifts`-Tabelle schreibt. Die Funktion wird einmalig aufgerufen und kann danach wieder entfernt werden.

### Daten-Mapping

```text
Extern (Zeiterfassung)              →  Lokal (Tagesabrechnung)
────────────────────────────────────────────────────────────────
employees.perso_nr                  →  staff.perso_nr (Match-Key)
employees.id → shifts.employee_id   →  staff.id → zt_shifts.employee_id
shifts.shift_date/start/end/hours   →  zt_shifts (gleiche Felder)
weeks (by start_date/end_date)      →  weeks (by start_date/end_date)
restaurants (by name: Spicery/YUM)  →  restaurants (by name)
```

### Lokale Daten (bereits vorhanden)
- **Spicery**: Periode `1c65963c` (Feb 26 – Mar 25), 5 Wochen
- **YUM**: Periode `da8ddfc8` (Feb 26 – Mar 25), 5 Wochen
- 38 aktive Mitarbeiter mit `perso_nr`
- 39 bestehende `zt_shifts`-Einträge (werden per Upsert nicht dupliziert)

### Ablauf
1. Edge Function liest externe Employees, Perioden (März), Wochen und Shifts
2. Matched Mitarbeiter über `perso_nr` zu lokalem `staff`
3. Matched externe Wochen zu lokalen Wochen über Datumsbereich
4. Matched Restaurants über Namen (Spicery ↔ Spicery, YUM ↔ YUM)
5. Upsert in `zt_shifts` (bestehende Einträge werden aktualisiert, nicht dupliziert)
6. Funktion wird einmalig per Test-Tool aufgerufen

### Änderungen

| Datei | Änderung |
|---|---|
| `supabase/functions/import-zeiterfassung/index.ts` | Temporäre Edge Function für einmaligen Import |
| `supabase/config.toml` | Function-Eintrag (wird automatisch verwaltet) |

### Hinweis
Die externen Supabase-Zugangsdaten (URL + Anon Key) sind aus dem Zeiterfassungs-Projekt bekannt und werden direkt in der Funktion verwendet (einmaliger Aufruf, kein Sicherheitsrisiko). Nach erfolgreichem Import kann die Funktion entfernt werden.

