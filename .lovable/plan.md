

## Fix: Fehlende Mitarbeiter in der Buchhaltung bei Restaurant-Filter

### Problem
Identisches Problem wie in der Zusammenfassung: `ZtBuchhaltung.tsx` filtert Schichten basierend auf `weekIdToRestaurantId`, wodurch Mitarbeiter wie Jean nicht erscheinen, wenn ihre Schichten unter einem anderen Restaurant-Kontext gespeichert wurden.

### Lösung
Den restriktiven Restaurant-Check auf Schichten an **2 Stellen** in `ZtBuchhaltung.tsx` entfernen:

1. **Zeile 187** (`employeesWithShiftsUnfiltered`): Die Bedingung `cumData.weekIdToRestaurantId[s.week_id] !== (emp as any).restaurant_id` entfernen
2. **Zeile 250** (`empShifts` im Render): Dieselbe Bedingung entfernen

Die Mitarbeiterliste ist bereits nach Restaurant gefiltert — der zusätzliche Check auf die Wochen-ID ist unnötig und schließt korrekte Schichten aus.

1 Datei, keine DB-Änderung.

