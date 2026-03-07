

## Verstaendnis

Du moechtest, dass die Statistiken standardmaessig die Umsaetze **beider** Restaurants (Spicery + YUM) kombiniert anzeigen, nicht nur das aktuell gewaehlte Restaurant.

## Loesung

Den Standard-Modus der Statistikseite von `'current'` (nur aktuelles Restaurant) auf `'all'` (alle Restaurants kombiniert) aendern.

**Datei: `src/pages/Statistics.tsx`**

Zeile 97 aendern:
```tsx
// Vorher:
const [statsMode, setStatsMode] = useState<StatsMode>('current');

// Nachher:
const [statsMode, setStatsMode] = useState<StatsMode>('all');
```

Damit werden beim Oeffnen der Statistik-Seite automatisch die Daten beider Restaurants kombiniert angezeigt. Der "Alle"-Tab ist vorausgewaehlt. Der Nutzer kann weiterhin auf einzelne Restaurant-Tabs wechseln, um nur deren Daten zu sehen.

