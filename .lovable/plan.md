

## Problem: Sumit fehlt in der Zeiterfassung

Sumit (SUMIT, perso_nr 109) ist beiden Restaurants (Spicery + YUM) zugewiesen, hat aber bei keinem eine **Abteilung für die Zeiterfassung** (`zt_department`) gesetzt. Die Zeiterfassungs-Ansichten filtern nur Mitarbeiter mit gesetztem `zt_department` — daher taucht Sumit nicht auf.

### Lösung

`zt_department` für Sumit setzen. Laut dem Screenshot gehört Sumit zur **Küche**.

### Änderung

Eine Migration, die `zt_department = 'Küche'` für Sumit bei beiden Restaurants setzt:

```sql
UPDATE staff_restaurants
SET zt_department = 'Küche'
WHERE staff_id = '0cbe9b9b-de09-4cb8-b0ee-936d15615a70';
```

Keine Code-Änderungen nötig.

