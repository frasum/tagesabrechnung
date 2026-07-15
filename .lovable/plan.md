## Kurzfassung

Es ist **keine Code-Änderung nötig**. Das Bearbeiten von Schichten im ZE-Wochenplan (Start/Ende, Pausen, Stunden, Abwesenheiten) ist im Code nicht an eine Rolle gebunden — es hängt nur an `isLocked` der Periode. Wer die Seite `Zeiterfassung → Wochenplan` sehen darf, darf dort auch bearbeiten. Der einzige Gate für Manager ist die **Navigations-Berechtigung**.

## Was du machen musst (Klick-Anleitung)

**Zugriff jetzt gewähren:**
1. Als Admin einloggen → Sidebar → **Berechtigungen**
2. Den gewünschten Manager auswählen
3. Häkchen setzen bei:
   - `ZE – Wochenplan`
   - (optional, falls er auch die Übersicht/Perioden-Sperre braucht:) `ZE – Zusammenfassung`, `ZE – Perioden`
4. Speichern → Manager sieht ab sofort den Tab und kann Schichten bearbeiten.

**Wichtig für Juli konkret:**
- Die Juli-Periode (26.06.–25.07.) darf **nicht gesperrt** sein — sonst sind alle Eingaben disabled. Prüfen unter `ZE → Perioden`.

**Zugriff nach Monatsabschluss wieder entziehen (manuell, wie gewünscht):**
- Berechtigungen-Seite → gleiche Häkchen entfernen → Speichern.
- Oder: Juli-Periode auf `locked` setzen → Manager sieht sie zwar noch, kann aber nichts mehr ändern.

## Was NICHT geändert wird

- Keine Datenbank-Migration.
- Keine neuen Rollen, kein Ablaufdatum-Feature (das wurde in der Frage als „mehr Aufwand" markiert und nicht gewählt).
- SFN-/Gehaltsspalten bleiben verborgen — das ist Absicht (Datenschutz) und wurde von dir auch nicht angefragt.

## Technischer Hintergrund (für dich zur Info)

- `src/pages/zeiterfassung/ZtLayout.tsx` filtert Tabs für Manager über `useManagerNavPermissions` → Tabelle `manager_nav_permissions`.
- Der Tab-Key ist `zeiterfassung` (Wochenplan), `zeiterfassung/zusammenfassung`, `zeiterfassung/perioden` etc. — genau die Einträge, die auf der Berechtigungen-Seite anklickbar sind.
- Innerhalb von `ZtWochenplan.tsx` gibt es **keinen** Admin-Only-Check auf Bearbeiten; nur `showSfn = hasPermission('admin')` blendet SFN-Spalten aus. Speichern/Löschen von Schichten ist frei, sofern die Periode offen ist.

Willst du, dass ich zusätzlich eine kleine Warnung/Notiz einbaue („Diese Periode ist gesperrt — Änderungen nicht möglich"), oder passt das so und du erledigst es rein über die Berechtigungen-Seite?
