

## Telegram Kassenbestand an Bargeldbestand-Seite angleichen

### Problem
Die `calculateCashBalance`-Funktion in der Telegram Edge Function berechnet den Kassenbestand anders als die Bargeldbestand-Seite. Es fehlen:
- **Deficit Chaining** (Fehlbetrag-Vortag wird nicht weitergereicht)
- **`sonstige_einnahme`** wird nicht beruecksichtigt
- **`initial_cash_deficit`** aus der Restaurants-Tabelle fehlt
- **Skimming-Logik** (Abschoepfung ueber Wechselgeld-Grenze) fehlt

### Loesung
Die `calculateCashBalance`-Funktion im Edge Function `send-telegram-summary` wird komplett ueberarbeitet, damit sie exakt dieselbe Berechnung wie `useRemainingCash` durchfuehrt.

### Technische Aenderungen

**Datei: `supabase/functions/send-telegram-summary/index.ts`**

Die Funktion `calculateCashBalance` wird wie folgt angepasst:

1. **`sonstige_einnahme`** zur Session-Abfrage hinzufuegen
2. **`initial_cash_deficit`** aus `restaurants`-Tabelle laden
3. **`petty_cash`** aus `settings`-Tabelle laden (bereits vorhanden)
4. **Deficit Chaining** einbauen: Pro Tag wird `rawBargeld + carryOver` berechnet; wenn negativ, wird der Betrag auf den naechsten Tag uebertragen
5. **Skimming-Logik** einbauen: Kassenbestand startet bei `petty_cash`, taegliches Bargeld wird addiert, ueberschuessiges Bargeld ueber `petty_cash` wird abgeschoepft

```text
Aktuell (falsch):
  totalCash += bargeld  (einfache Summe)
  return totalCash + pettyCash

Neu (korrekt):
  1. carryOver = initial_cash_deficit
  2. Pro Tag:
     rawBargeld = Einnahmen - Abzuege
     bargeld = rawBargeld + carryOver
     carryOver = bargeld < 0 ? bargeld : 0
  3. kassenbestand = pettyCash
  4. Pro Tag:
     kassenbestand += bargeld
     if kassenbestand > pettyCash: kassenbestand = pettyCash
  5. return kassenbestand
```

Keine Aenderungen an der UI oder anderen Dateien noetig.

