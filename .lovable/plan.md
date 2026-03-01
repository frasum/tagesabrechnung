

## YUM-Schichtdaten aus Zeiterfassung nachimportieren

Der erste Import hat nur Spicery-Daten erfasst. Für YUM muss der gleiche einmalige Import wiederholt werden.

### Vorgehen
1. Temporäre Edge Function erstellen (gleiche Logik wie beim Spicery-Import)
2. Externes Zeiterfassungs-Projekt abfragen: YUM-Mitarbeiter + März-Schichten
3. Matching über `perso_nr` zu lokalen `staff`-Einträgen
4. Wochen-Matching über Datumsbereiche zu lokaler YUM-Periode `da8ddfc8` (Feb 26 – Mar 25)
5. Insert in `zt_shifts`
6. Edge Function nach Import wieder entfernen

### Lokale YUM-Daten
- **Periode**: `da8ddfc8-024e-4b00-83c4-52f327d4b53b` (März 2026)
- **Restaurant-ID**: `3065f458-6d66-4a5d-a85e-f8ee33bb7351`
- 22 Mitarbeiter mit `zt_department` zugewiesen (davon einige ohne `perso_nr`: Adisorn, Elison, Kris)

### Änderungen

| Datei | Änderung |
|---|---|
| `supabase/functions/import-zeiterfassung/index.ts` | Temporäre Edge Function für YUM-Import, wird nach Aufruf entfernt |

