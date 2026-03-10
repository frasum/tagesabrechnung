

## Problem

Die Sortierung in allen Zeiterfassungs-Views nutzt `a.nickname || a.first_name` — aber wie gerade festgestellt, ist bei vielen Mitarbeitern der Spitzname im `name`-Feld gespeichert, nicht in `nickname`. Dadurch wird z.B. "SORN" (Adisorn) nicht für die alphabetische Sortierung verwendet, sondern "Adisorn".

## Lösung

Den gleichen `effectiveNickname`-Fallback auch in der Sortierung verwenden:

```tsx
// Vorher:
const nameA = (a.nickname || a.first_name || "").toLowerCase();

// Nachher:
const nameA = (a.nickname || (a.name && a.name !== a.first_name && a.name !== a.last_name ? a.name : null) || a.first_name || "").toLowerCase();
```

### Betroffene Dateien (6 Stellen)

1. **`ZtWochenplan.tsx`** — Zeile 230-231
2. **`ZtBuchhaltung.tsx`** — Zeile 154-155
3. **`ZtZusammenfassung.tsx`** — Zeile 138-139 und Zeile 352-353
4. **`SharedZtView.tsx`** — Zeile 176-177 und Zeile 357-358

Alle 6 Stellen erhalten dieselbe einzeilige Änderung der Sortiervariablen.

