

## Trinkgeldpool-Ausschluss über Mitarbeitereinstellungen

Aktuell wird `participates_in_pool` pro Schicht in `waiter_shifts` gesetzt (Standard: `true`). Die Idee: Ein neues Feld `participates_in_pool` direkt am Mitarbeiter (`staff`-Tabelle), das als **Standardwert** beim Anlegen einer Abrechnung verwendet wird.

### Änderungen

| Datei / Bereich | Änderung |
|---|---|
| **Migration** | `ALTER TABLE staff ADD COLUMN participates_in_pool boolean NOT NULL DEFAULT true;` |
| `src/hooks/useStaff.ts` | `Staff`-Interface und `StaffInput` um `participates_in_pool` erweitern. |
| `src/components/staff/StaffDialogNative.tsx` | Neuer Toggle/Switch im Dialog: "Am Trinkgeldpool beteiligt". |
| `src/pages/WaiterCashUp.tsx` | Beim Auswählen eines Kellners den Standardwert aus `staff.participates_in_pool` übernehmen (statt immer `true`). Kann pro Schicht weiterhin überschrieben werden. |
| `src/components/staff/StaffTableRow.tsx` | Optional: Anzeige "(kein Pool)" Badge wenn `participates_in_pool = false`. |

### Logik

- Der Mitarbeiter-Stammdatensatz bestimmt den **Default** — nicht den absoluten Wert
- Bei der Abrechnung kann der Pool-Status pro Schicht weiterhin manuell geändert werden
- Bestehende Schichten bleiben unverändert (das Feld auf `waiter_shifts` bleibt maßgeblich)

### Datenfluss

```text
Staff Dialog → staff.participates_in_pool = false
                        ↓
WaiterCashUp → Kellner auswählen → Default aus staff laden
                        ↓
waiter_shifts.participates_in_pool = false (überschreibbar)
```

