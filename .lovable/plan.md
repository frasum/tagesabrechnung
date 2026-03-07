

# KI-Chat: Datenzugriff über 90 Tage hinaus erweitern

## Problem
Die Edge Function lädt Sessions und Zeiterfassungsdaten nur für die letzten 90 Tage. Wenn der Nutzer nach Jahresvergleichen, Langzeittrends oder älteren Perioden fragt, hat die KI keine Daten.

## Lösung
Die **aggregierten** Daten (monatliche Zusammenfassungen) werden auf **alle verfügbaren Daten** erweitert — kein 90-Tage-Limit mehr für Aggregationen. Die **Rohdaten** (einzelne Schichten, Ausgaben) bleiben auf 30 Tage begrenzt, um den Kontext kompakt zu halten.

## Änderungen in `supabase/functions/restaurant-chat/index.ts`

### 1. Sessions ohne Datumslimit laden
- Zeile 78: `.gte("session_date", since90Str)` entfernen
- Limit von 5000 auf 10000 erhöhen für mehr historische Daten

### 2. zt_shifts ohne 90-Tage-Filter
- Zeile 133: `.filter((z) => z.shift_date >= since90Str)` entfernen
- Stattdessen alle zt_shifts laden (bereits ohne Datumslimit in der Query)

### 3. System-Prompt anpassen
- "letzten 90 Tage" → "den gesamten verfügbaren Zeitraum" für aggregierte Daten
- Hinweis dass Rohdaten weiterhin auf 30 Tage begrenzt sind
- Regel hinzufügen: Bei Fragen nach Jahresvergleichen, Trends oder längeren Zeiträumen die monatlichen Zusammenfassungen nutzen

### 4. Kontext-Überschriften anpassen
- "voraggregiert" Überschriften aktualisieren, um klarzumachen dass sie alle verfügbaren Monate abdecken

### Auswirkung auf Performance
Die aggregierten Tabellen wachsen um ca. 1 Zeile pro Monat pro Restaurant — bei 2 Restaurants und 12 Monaten sind das nur ~24 zusätzliche Zeilen pro Tabelle. Die Datenbank-Queries werden etwas größer, aber die Aggregation hält den Kontext kompakt.

