

## Restaurantübergreifende Mitarbeitersuche

### Konzept
Wenn ein Suchbegriff eingegeben wird, werden automatisch Mitarbeiter aus **allen Restaurants** angezeigt — unabhängig davon, welches Restaurant gerade ausgewählt ist. Neben dem Namen wird das Restaurant und die Abteilung als Badge angezeigt.

### Änderungen

**1. `src/hooks/useCumulatedZtData.ts`** — Restaurant-Info zu Mitarbeitern hinzufügen
- `restaurant_id` und `restaurant_name` (über Join mit `restaurants`) in die Employee-Query aufnehmen
- Deduplizierung erweitern auf `staff_id + department + restaurant_id` (ein Mitarbeiter kann in mehreren Restaurants arbeiten)
- `RestaurantEmployee`-Typ um `restaurant_name?: string` erweitern

**2. `src/hooks/useRestaurantEmployees.ts`** — Typ erweitern
- `restaurant_name?: string` zum `RestaurantEmployee`-Typ hinzufügen (optional, damit bestehender Code nicht bricht)

**3. `src/pages/zeiterfassung/ZtWochenplan.tsx`** — Suche triggert kumulierten Modus
- Wenn `searchTerm.trim()` aktiv: `employees` und `shifts` aus `cumData` verwenden statt aus `restaurantEmployees`
- Die cumData-Hook-Aktivierung ändern: `enabled = cumulated || !!searchTerm.trim()`
- Restaurant-Badge neben dem Mitarbeiternamen anzeigen wenn `searchTerm` aktiv
- Abteilungs-Header ausblenden bei aktiver Suche (bereits teilweise vorhanden)

**4. `src/pages/zeiterfassung/ZtZusammenfassung.tsx`** — gleiche Logik
- Bei aktiver Suche cumData verwenden
- `allRestaurantEmployees`-Query ist bereits vorhanden (Zeile 57-77), kann wiederverwendet werden — muss aber um `restaurant_name` erweitert werden
- Restaurant-Badge neben dem Namen anzeigen

**5. `src/pages/zeiterfassung/ZtBuchhaltung.tsx`** — gleiche Logik
- Bei aktiver Suche cumData verwenden
- Restaurant-Badge anzeigen

**6. `src/pages/shared/PayrollPortal.tsx`** — Restaurant-Badge bei Suche
- Daten sind bereits kumuliert. Nur Restaurant-Name als Badge neben dem Mitarbeiternamen anzeigen wenn `searchTerm` aktiv
- Die `employees`-Daten aus der Edge Function enthalten bereits `restaurant_id` — prüfen ob auch `restaurant_name` vorhanden ist, ggf. aus `matchingPeriods` mappen

### Darstellung (Beispiel)
Bei aktiver Suche erscheint neben dem Namen ein kleiner Badge:
```
Max Mustermann  [Spicery · Service]
```
Ohne Suche bleibt alles wie bisher.

### Betroffene Dateien
- `src/hooks/useRestaurantEmployees.ts` (Typ-Erweiterung)
- `src/hooks/useCumulatedZtData.ts` (restaurant_name hinzufügen)
- `src/pages/zeiterfassung/ZtWochenplan.tsx`
- `src/pages/zeiterfassung/ZtZusammenfassung.tsx`
- `src/pages/zeiterfassung/ZtBuchhaltung.tsx`
- `src/pages/shared/PayrollPortal.tsx`

6 Dateien, keine DB-Änderungen nötig.

