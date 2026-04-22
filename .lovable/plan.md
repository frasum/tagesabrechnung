

# BankDepositDialog: Garantierter Reset beim Öffnen

## Problem
Beim Schließen des Dialogs über **Overlay-Klick** oder **ESC-Taste** wird `handleClose` nicht aufgerufen → der lokale State (Betrag, Datum, Notiz) bleibt erhalten. Beim nächsten Öffnen sieht der Nutzer ggf. den zuletzt eingegebenen Wert statt der frischen `defaultAmount`-Vorbelegung.

## Lösung
In `src/components/cash-balance/BankDepositDialog.tsx`:

1. **`useEffect` erweitern**, sodass beim Übergang `open: false → true` **alle** Form-Felder zurückgesetzt werden:
   - `amount` → `defaultAmount`
   - `date` → `new Date()` (heute)
   - `notes` → `''`
   - `calendarOpen` → `false`

2. **`onOpenChange`-Handler korrigieren**: Aktuell ruft `<Dialog onOpenChange={handleClose}>` `handleClose` auch beim Öffnen auf (mit `open=true`), was unbeabsichtigt zurücksetzt. Stattdessen: `onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}` — oder einfacher: Reset komplett aus `handleClose` entfernen und ausschließlich im `useEffect` beim Öffnen reseten.

3. **Cleaner Ansatz**: Einzige Reset-Quelle ist der `useEffect([open])`-Hook. `handleClose` ruft nur `onOpenChange(false)` auf. Das eliminiert doppelte Reset-Logik und garantiert konsistentes Verhalten.

## Betroffene Datei
- `src/components/cash-balance/BankDepositDialog.tsx`

## Nicht betroffen
- `CashBalanceSummary.tsx`, `CashBalance.tsx`, Datenmodell, andere Dialoge.

## Erwartetes Ergebnis
- Egal wie der Dialog geschlossen wird (Button, Overlay-Klick, ESC) → beim erneuten Öffnen ist der Betrag immer auf `defaultAmount` (mögliche Einzahlung) gesetzt
- Datum immer auf „heute", Notizfeld immer leer
- Keine versehentlich übernommenen Werte aus vorherigem Bearbeitungsversuch

