

## Problem

Das Konflikt-Popup im Wochenplan zeigt nur "Bereits in Küche eingetragen", aber nicht in welchem Restaurant/Betrieb der Mitarbeiter bereits eingeteilt ist. Die `globalShifts`-Query lädt nur `zt_shifts`-Daten ohne Restaurant-Bezug.

## Lösung

Die `globalShifts`-Query um einen Join über `weeks → scheduling_periods → restaurants` erweitern, damit der Restaurant-Name im Konflikt-Objekt verfügbar ist. Dann die Tooltip-Anzeige anpassen.

### Änderungen in `ZtWochenplan.tsx`

**1. Query erweitern (Zeile 244-245)**

```tsx
.select("employee_id, shift_date, department, week_id, start_time, end_time, total_hours, absence_type, weeks!inner(scheduling_periods!inner(restaurants(name)))")
```

**2. Tooltip-Text anpassen (Zeile 748)**

Den Restaurant-Namen aus dem Join auslesen und anzeigen:

```tsx
<p>Bereits in {conflict.department || "anderer Abteilung"} eingetragen</p>
<p className="text-muted-foreground mt-1">
  {conflict.weeks?.scheduling_periods?.restaurants?.name}
</p>
```

So sieht der Nutzer z.B.: "Bereits in Küche eingetragen" + darunter "Spicery" als Betriebsstätte.

