

## Problem

Der Chat zeigt die Antwort ohne Aufschluesselung nach Restaurant, weil die Kellner- und Kuechenschichten im AI-Kontext keine Restaurant-Zuordnung haben. Die Daten zeigen nur `Session-Datum | Name | ...` aber nicht welches Restaurant. Da die AI nicht weiss welche Session zu welchem Restaurant gehoert, kann sie die Antwort nicht nach YUM und Spicery aufteilen.

Ausserdem fehlt im System-Prompt die Anweisung, Antworten immer nach Restaurant aufzuschluesseln wenn mehrere vorhanden sind.

## Loesung

| Datei | Aenderung |
|---|---|
| `supabase/functions/restaurant-chat/index.ts` | 1. Restaurant-Name in alle Datenbereiche (Kellner-Schichten, Kuechen-Schichten, Ausgaben, Vorschuesse) einfuegen, indem `sessionDateMap` zu einer Map erweitert wird die auch den Restaurant-Namen enthaelt. 2. System-Prompt erweitern: "Wenn der User mehrere Restaurants hat, gliedere die Antwort immer nach Restaurant." |

### Details

1. `sessionDateMap` wird zu `sessionInfoMap` mit `{ date, restaurant }` pro Session-ID
2. Alle Kontext-Zeilen fuer Schichten/Ausgaben/Vorschuesse bekommen eine Restaurant-Spalte
3. System-Prompt bekommt die Regel: "Wenn mehrere Restaurants vorhanden sind, gliedere deine Antwort immer nach Restaurant"

