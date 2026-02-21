

## Problem

Zwei Werte fehlen in der Tagesabrechnung:

1. **Tages-Bargeld** (`bargeldRaw`): Wird absichtlich nur angezeigt, wenn ein Fehlbetrag vom Vortag existiert (`previousDeficit < 0`). An Tagen ohne Vortags-Defizit wird die Zeile ausgeblendet.

2. **Wechselgeldbestand** (`remainingCash`): Sollte immer sichtbar sein (`remainingCash !== undefined`), da der Hook immer eine Zahl liefert. Eventuell gibt es ein Timing-Problem beim Rendering.

## Loesung

Beide Werte werden **immer** in der Tagesabrechnung angezeigt, unabhaengig davon ob ein Fehlbetrag vom Vortag existiert oder nicht.

### Aenderungen

**Datei: `src/components/daily-summary/layouts/ExcelLayout.tsx`**

1. **Tages-Bargeld immer anzeigen**: Die Bedingung `previousDeficit < 0 && bargeldRaw !== undefined` wird entfernt. Stattdessen wird die Zeile immer angezeigt (wenn `bargeldRaw` definiert ist), damit der Tageswert isoliert sichtbar bleibt.

2. **Wechselgeldbestand immer anzeigen**: Die Bedingung `remainingCash !== undefined` bleibt bestehen, aber es wird sichergestellt, dass kein anderer Faktor die Anzeige verhindert. Zusaetzlich wird ein Fallback-Wert (`?? 0`) verwendet, um sicherzustellen, dass der Wert nie `undefined` ist.

### Technische Details

```text
Vorher (Tages-Bargeld):
  {previousDeficit < 0 && bargeldRaw !== undefined && <div>...</div>}

Nachher (Tages-Bargeld):
  {bargeldRaw !== undefined && <div>...</div>}

Vorher (Wechselgeldbestand):  
  {remainingCash !== undefined && <div>...</div>}

Nachher (Wechselgeldbestand):
  <div>...</div>  (immer sichtbar, mit Fallback remainingCash ?? 0)
```

Damit sind beide Werte auf jeder Tagesabrechnung sichtbar, egal ob ein Fehlbetrag vom Vortag besteht oder nicht.

