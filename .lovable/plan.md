

## Plan: Mo–Fr Erzeugung nur für "Peter"

### Änderung

**`src/pages/zeiterfassung/ZtZusammenfassung.tsx`** (1 Zeile):
- Die `allEmployees`-Prop an `ShiftTimeOverride` wird gefiltert: nur Mitarbeiter deren `name`, `first_name` oder `nickname` "Peter" enthält werden übergeben.

```typescript
allEmployees={sortedEmployees.filter(e => 
  [e.name, e.first_name, e.nickname].some(n => n?.toLowerCase().includes("peter"))
)}
```

Das bewirkt, dass der zweite Abschnitt ("Mo–Fr Schichten erzeugen & anpassen") nur Peter anzeigt. Der erste Abschnitt ("Bestehende Schichten überschreiben") bleibt unverändert und zeigt weiterhin alle Mitarbeiter mit Schichten.

