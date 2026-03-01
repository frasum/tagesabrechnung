

## Zeiterfassung-Berechtigung hinzufügen

Einfache Ergänzung: Der Pfad `zeiterfassung` muss in zwei Stellen in `src/types/permissions.ts` hinzugefügt werden.

### Änderungen

**`src/types/permissions.ts`**
1. `NAV_PERMISSIONS`: Neuen Eintrag `'zeiterfassung': { label: 'Zeiterfassung', description: 'Arbeitszeiten verwalten', minLevel: 'manager' }` hinzufügen
2. `MANAGER_NAV_ITEMS`: Neuen Eintrag `{ path: 'zeiterfassung', label: 'Zeiterfassung' }` hinzufügen

### Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/types/permissions.ts` | Zeiterfassung in beide Arrays einfügen |

Keine weiteren Dateien betroffen -- die PermissionManagement-Seite und die Navigation lesen bereits aus diesen Arrays.

