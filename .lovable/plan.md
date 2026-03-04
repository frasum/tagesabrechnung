

## Plan: Evening + Night Hours kombinieren für Nachtzuschlag

### Problem
Die App speichert Abendstunden (20:00–24:00) und Nachtstunden (00:00–06:00) getrennt. Für die SFN-Zuschlagsberechnung nach §3b EStG zählen aber beide als zuschlagspflichtige Nachtarbeit. Aktuell werden nur `night_hours` (nach Mitternacht) für den Nachtzuschlag verwendet – `evening_hours` werden ignoriert.

### Änderung

**Datei: `src/pages/zeiterfassung/ZtBruttoNetto.tsx`**

1. **Aggregation (Zeile ~132)**: `nightHours` wird zu `evening + night` kombiniert:
   ```
   nightHours: Math.round((agg.night + agg.evening) * 100) / 100
   ```

2. **Anzeige (Zeile ~343)**: Label von "Nachtstunden" zu "Nachtstunden (20–06 Uhr)" ändern, damit klar ist was enthalten ist.

3. Die separate `eveningHours`-Property im Return-Objekt kann entfallen, da sie nicht mehr separat benötigt wird.

Alle anderen Stellen (SFN-Berechnung, API-Aufruf) verwenden bereits `sfnData.nightHours` und brauchen keine Änderung.

