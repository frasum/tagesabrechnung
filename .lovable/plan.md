

## Mitarbeiter-Suchfeld für Wochenplan, Zusammenfassung & Buchhaltung

### Idee
Ein Suchfeld oberhalb der Tabelle, das Mitarbeiter nach Name filtert. Bei Eingabe werden nur passende Mitarbeiter angezeigt, alle anderen ausgeblendet. Sichtbar nur für Admins (in der Manager-App) und im Lohnbüro-Portal.

### Umsetzung

**1. Neue Komponente `EmployeeSearchFilter`**
- Einfaches Input-Feld mit Such-Icon und "Mitarbeiter suchen…" Placeholder
- Kontrollierter State (`searchTerm`), gibt gefilterten String nach oben weiter
- Löschen-Button (X) wenn Text eingegeben ist
- Kompakt gestaltet, passt in die Toolbar-Zeile

**2. Integration in 3 Ansichten (Manager-App)**
- `ZtWochenplan.tsx`: State `searchTerm`, Filter auf sortierte Mitarbeiterliste (Name/Nickname/Vorname enthält Suchbegriff). Nur sichtbar wenn `hasPermission('admin')`.
- `ZtZusammenfassung.tsx`: Gleiche Logik.
- `ZtBuchhaltung.tsx`: Gleiche Logik. Department-Header werden nur angezeigt, wenn mindestens ein Mitarbeiter im Department dem Filter entspricht.

**3. Integration im Lohnbüro-Portal**
- `PayrollPortal.tsx`: Gleiches Suchfeld in allen 3 Tabs (Wochenplan, Zusammenfassung, Buchhaltung). Hier immer sichtbar (Lohnbüro hat per Definition Zugriff).

**4. Filter-Logik**
```
const filtered = employees.filter(emp => {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  const displayName = (emp.nickname || emp.name || emp.first_name || "").toLowerCase();
  return displayName.includes(term) || 
         (emp.first_name?.toLowerCase().includes(term)) ||
         (emp.last_name?.toLowerCase().includes(term));
});
```

### Dateien
- `src/components/zeiterfassung/EmployeeSearchFilter.tsx` — Neue Komponente (Input + X-Button)
- `src/pages/zeiterfassung/ZtWochenplan.tsx` — State + Filter + Komponente einbinden (nur Admin)
- `src/pages/zeiterfassung/ZtZusammenfassung.tsx` — State + Filter + Komponente einbinden (nur Admin)
- `src/pages/zeiterfassung/ZtBuchhaltung.tsx` — State + Filter + Komponente einbinden (nur Admin)
- `src/pages/shared/PayrollPortal.tsx` — State + Filter + Komponente in allen 3 Tabs einbinden (immer sichtbar)

5 Dateien, keine DB-Änderungen nötig.

