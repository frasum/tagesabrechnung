

## Analyse: Gleiche Nettoauszahlung bei Simple vs. Extended

### Ursache

Beim Wechsel des SFN-Modus (Einfach ↔ §3b) passiert Folgendes:

1. **Die Schichtdaten (`sfnData`) werden korrekt neu geladen** — der React-Query-Key enthält `sfnMode`, also werden die Stunden neu aggregiert.
2. **Das Berechnungsergebnis (`result`) wird NICHT automatisch aktualisiert.** Es bleibt im State stehen, bis der User erneut auf "Berechnen" klickt. Das heißt: Wenn man den Modus wechselt, zeigt die Seite weiterhin das alte Ergebnis an.

Das ist der Hauptfehler: Der User sieht dasselbe Ergebnis, weil es nicht neu berechnet wird.

Zusätzlich: Falls Peter Pleile in der Periode keine Sonntags-/Feiertagsschichten hat, sind die Ergebnisse tatsächlich identisch, da der Unterschied nur bei So/Fei-Stunden und additiven Nachtzuschlägen greift.

### Fix

**Datei: `src/pages/zeiterfassung/ZtBruttoNetto.tsx`**

1. **`result` und `error` zurücksetzen, wenn `sfnMode` sich ändert** — ein `useEffect` das bei `sfnMode`-Änderung `setResult(null)` aufruft, damit der User klar sieht, dass er neu berechnen muss.

2. **Alternativ (besser): Automatisch neu berechnen** — wenn sich `sfnData` ändert UND bereits ein Ergebnis vorliegt, automatisch `handleCalculate()` erneut aufrufen.

3. **Visuellen Hinweis anzeigen**, wenn sfnData sich geändert hat aber das Ergebnis noch vom alten Modus stammt (z.B. Badge "Ergebnis veraltet — bitte neu berechnen").

### Empfohlener Ansatz

Option 2 (Auto-Recalc) ist die beste UX: Ein `useEffect` der auf `sfnData` reagiert und, wenn bereits ein `result` existiert, automatisch `handleCalculate()` triggert. So sieht der User sofort das aktualisierte Ergebnis beim Moduswechsel.

```text
sfnMode wechselt → sfnData Query refetcht → useEffect erkennt neues sfnData + vorhandenes result → handleCalculate() → neues result
```

