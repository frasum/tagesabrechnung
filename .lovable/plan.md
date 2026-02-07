
## Pool-Ausschluss: Kellner vom Trinkgeld ausschließen

### Zusammenfassung

Manche Kellner gehen früh nach Hause und sollen nicht am Trinkgeld-Pool teilnehmen. Dazu wird eine Checkbox "Am Pool beteiligt" neben dem Formular-Titel eingefügt. Standardmäßig ist sie aktiviert - wenn deaktiviert, bekommt der Kellner kein Trinkgeld aus dem Pool.

---

### Wie es funktioniert

**Eingabe:**
- Checkbox "Am Pool beteiligt" rechts neben dem Titel "Neuen Kellner hinzufügen"
- Standard: aktiviert (Kellner nimmt am Pool teil)
- Wenn deaktiviert: Kellner wird nicht im Pool gezählt und erhält kein Trinkgeld

**Pool-Berechnung:**
- Nur Kellner mit aktivierter Pool-Beteiligung werden als Anteile gezählt
- Ihr Trinkgeld-Beitrag (Differenz) fließt trotzdem in den Pool!
- Sie erscheinen weiterhin in der Übersicht, aber ihr Anteil wird als "0,00 €" angezeigt

**Beispiel:**
```text
Schicht 1: Gerard (am Pool) → bekommt Anteil
Schicht 2: Anna (am Pool)   → bekommt Anteil  
Schicht 3: Max (NICHT am Pool) → bekommt 0,00 €, aber sein Beitrag geht in den Pool

Pool: 300 €, 2 Anteile (Gerard + Anna)
→ Gerard bekommt 150 €
→ Anna bekommt 150 €
→ Max bekommt 0 € (ging früh nach Hause)
```

---

### Visuelle Änderung im Formular

```text
+-----------------------------------------------+
| 👤 Neuen Kellner hinzufügen    ☑ Am Pool beteiligt |
+-----------------------------------------------+
| Kellner auswählen                             |
| [Dropdown: Kellner wählen]                    |
| ...                                           |
+-----------------------------------------------+
```

Im Bearbeitungsmodus:
```text
+-----------------------------------------------+
| ✏️ Kellner bearbeiten: Gerard  ☑ Am Pool beteiligt |
+-----------------------------------------------+
```

---

### Technische Umsetzung

#### 1. Datenbank-Änderung

Neue Spalte in der `waiter_shifts` Tabelle:

| Spalte | Typ | Default | Beschreibung |
|--------|-----|---------|--------------|
| `participates_in_pool` | boolean | true | Ob Kellner am Trinkgeld-Pool teilnimmt |

#### 2. TypeScript-Typen aktualisieren

`src/types/database.ts` - WaiterShift Interface erweitern:
```typescript
export interface WaiterShift {
  // ... bestehende Felder
  participates_in_pool: boolean;
}
```

#### 3. Formular erweitern (`WaiterCashUp.tsx`)

- Neues State-Feld: `participatesInPool` (default: true)
- Checkbox im Header der Card rechts neben dem Titel
- Beim Bearbeiten wird der bestehende Wert geladen
- Beim Speichern wird der Wert mitgeschickt

#### 4. Pool-Berechnung anpassen

**Aktuell:**
```typescript
const waiterShareCount = waiterShifts.reduce((count, shift) => {
  return count + (shift.second_waiter_name ? 2 : 1);
}, 0);
```

**Neu:**
```typescript
const waiterShareCount = waiterShifts.reduce((count, shift) => {
  if (!shift.participates_in_pool) return count; // Nicht am Pool beteiligt
  return count + (shift.second_waiter_name ? 2 : 1);
}, 0);
```

#### 5. Übersichts-Tabelle anpassen

- Kellner ohne Pool-Beteiligung zeigen "0,00 €" als Anteil
- Optional: Visuelle Markierung (z.B. ausgegraut oder mit Icon)

#### 6. Statistik-Hooks anpassen

**`useMonthlyStaffTips.ts` und `useWaiterTipAverages`:**
- Nur Schichten mit `participates_in_pool = true` in die Trinkgeld-Statistik einbeziehen
- Schichten ohne Pool-Beteiligung werden nicht als Trinkgeld gezählt

---

### Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| Datenbank | Neue Spalte `participates_in_pool` in `waiter_shifts` |
| `src/types/database.ts` | WaiterShift Interface erweitern |
| `src/pages/WaiterCashUp.tsx` | Checkbox + Pool-Logik anpassen |
| `src/hooks/useSession.ts` | Create/Update um neues Feld erweitern |
| `src/hooks/useMonthlyStaffTips.ts` | Pool-Berechnung anpassen |

---

### Sonderfälle

1. **Zweiter Kellner:** Wenn der erste Kellner nicht am Pool teilnimmt, der zweite aber schon (oder umgekehrt), wird das komplex. Einfachste Lösung: Die Checkbox gilt für beide Kellner der Schicht
2. **Self-Service:** Im Self-Service können Kellner diese Option nicht ändern - nur der Manager kann entscheiden
3. **Statistik:** Schichten ohne Pool-Beteiligung tauchen in der Monats-Trinkgeldstatistik nicht auf
