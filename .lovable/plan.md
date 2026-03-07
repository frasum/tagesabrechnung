

# Umsatz-Klick zur Tagesabrechnung + Tooltip-Prüfung

## Aktuelle Situation

- In der Tagesdetails-Tabelle ist die **Stunden**-Spalte bereits klickbar (navigiert zu Zeiterfassung mit `?date=`)
- Die **Umsatz**-Spalte (Zeile 502) ist **nicht klickbar** — soll aber zur Kellner-Abrechnung des jeweiligen Tages navigieren
- Die Tooltips bei Service-MA (Zeilen 481-494) zeigen `day.staffNames` an — diese werden aus `nameSet` befüllt, das sekundäre und zusätzliche Kellner korrekt enthält. Nach der GL_ROLES-Änderung sollte Lam dort jetzt auch erscheinen.

## Änderungen

### 1. Umsatz-Zelle klickbar machen (ZtProvision.tsx, Zeile 502)

Die Umsatz-Zelle bekommt denselben Klick-Stil wie die Stunden-Zelle, navigiert aber zur Kellner-Abrechnung (`/${restaurantSlug}`) und setzt das Datum über `useSelectedDate`:

```tsx
// Import useSelectedDate hinzufügen
const { setSelectedDate } = useSelectedDate();

// Umsatz-Zelle klickbar machen:
<TableCell
  className="text-right tabular-nums cursor-pointer hover:text-primary hover:underline underline-offset-4 transition-colors"
  onClick={() => {
    setSelectedDate(new Date(day.date + "T00:00:00"));
    navigate(`/${restaurantSlug}`);
  }}
>
  {fmt(day.revenue)}
</TableCell>
```

### 2. Tooltip-Text aktualisieren

Die Subtitle-Zeile in Zeile 432 erwähnt noch "ohne GL-Mitarbeiter". Da `waiter_gl` jetzt einbezogen wird, sollte der Text angepasst werden zu "ohne reine GL-Mitarbeiter" oder ganz entfernt werden.

**Dateien:** `src/pages/zeiterfassung/ZtProvision.tsx` — eine Datei, drei kleine Änderungen.

