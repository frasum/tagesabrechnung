

# Karten-Header: Restaurant + Stichdatum anzeigen

## Ziel
Im Header der Karte „Aktueller Bargeldbestand" wird zusätzlich angezeigt, **für welches Restaurant** und **bis einschließlich welches Datum** der Bestand gilt — damit auf einen Blick klar ist, worauf sich die Zahlen beziehen.

## Anzeige

```text
┌──────────────────────────────────────────────────────────
│ 💼  Aktueller Bargeldbestand · Spicery
│     Stand: bis einschließlich 22.04.2026
└──────────────────────────────────────────────────────────
```

- **Titel-Zeile**: „Aktueller Bargeldbestand · {Restaurant-Name}"
- **Untertitel**: „Stand: bis einschließlich {dd.MM.yyyy}" (statt bisher „Physisch in der Kasse + Aufschlüsselung")
- Datum = aktuell ausgewähltes Datum aus dem `DateContext` (das gleiche Datum, das bereits die Berechnung steuert)
- Restaurant-Name = aktiv ausgewähltes Restaurant aus dem `RestaurantContext`

## Technische Umsetzung

In `src/components/cash-balance/CashBalanceSummary.tsx`:
- Zwei neue optionale Props: `restaurantName: string` und `referenceDate: Date | string`
- Header-Block anpassen: Restaurant-Name hinter den Titel mit Trenner „·", Untertitel auf „Stand: bis einschließlich …" ändern
- Datum mit `format(date, 'dd.MM.yyyy', { locale: de })` (date-fns ist bereits importiert)

In `src/pages/CashBalance.tsx`:
- `restaurantName` aus `useRestaurant()` und `referenceDate` aus `useDateContext()` an `<CashBalanceSummary>` durchreichen

## Betroffene Dateien
- `src/components/cash-balance/CashBalanceSummary.tsx`
- `src/pages/CashBalance.tsx`

## Nicht betroffen
- Datenmodell, Berechnungslogik, alle anderen Karten/Tabellen

## Erwartetes Ergebnis
- Sofort erkennbar: „Das ist der Bestand für **Spicery**, Stand **22.04.2026**"
- Verwechslungsgefahr beim Restaurant-Wechsel deutlich reduziert
- Konsistent mit dem ohnehin im Header sichtbaren Restaurant-Switcher

