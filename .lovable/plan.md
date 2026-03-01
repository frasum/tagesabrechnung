

## Problem

Mitarbeiter "Ah" hat `staff.role = 'kitchen'` in der Datenbank, aber `zt_department = NULL` bei Spicery. Das Badge "Küche" kommt aus dem alten `staff.role`-Wert, der vor der Umstellung auf Abteilungs-Checkboxen gesetzt wurde.

## Lösung

Die Rollen-Badges in der Tabelle sollten nicht mehr aus `staff.role` abgeleitet werden, sondern **direkt aus den tatsächlichen `zt_department`-Zuweisungen** in `staff_restaurants`. So zeigt die Tabelle nur an, was wirklich zugewiesen ist.

Zusätzlich: Bestehende Staff-Einträge ohne `zt_department` bereinigen via Migration.

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/staff/StaffTableRow.tsx` | Rollen-Badges aus `staff.staff_restaurants[].zt_department` ableiten statt aus `enumToRoles(staff.role)` — eindeutige Departments über alle Zuweisungen sammeln und als Badges anzeigen |
| DB-Migration | `UPDATE staff SET role = 'waiter' WHERE id IN (SELECT staff_id FROM staff_restaurants WHERE zt_department IS NULL)` — alternativ: `zt_department` für bestehende Einträge aus `staff.role` ableiten und nachträglich setzen |

### Option: Bestehende Daten reparieren

Statt nur die Anzeige zu ändern, könnten wir auch eine Migration laufen lassen, die für alle `staff_restaurants`-Einträge mit `zt_department = NULL` die Abteilung aus `staff.role` ableitet und setzt. So wären die Daten konsistent.

