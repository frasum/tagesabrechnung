

## Telegram Wechselgeldbestand-Berechnung korrigieren

### Problem

Die Telegram Edge Function (`send-telegram-summary`) berechnet den Wechselgeldbestand falsch, weil sie nur Tage mit einer Session beruecksichtigt. Kassentransfers an Tagen ohne Session (z.B. Einlagen am Ruhetag) werden komplett ignoriert.

Fuer Spicery fehlen:
- 09.02.: Entnahme 1.104 EUR + Einlage 270 EUR (netto -834 EUR)
- 15.02.: Einlage 6.346,22 EUR

Dadurch ergibt sich ein Wechselgeldbestand von ~1.086 EUR statt der korrekten 2.000 EUR.

Die Web-App (`useCashBalanceData`) loest das bereits korrekt, indem sie Transfer-Only-Tage als eigene Eintraege in die Berechnung einbezieht.

### Loesung

**Datei: `supabase/functions/send-telegram-summary/index.ts`**

Die Funktion `calculateCashBalance` (ab Zeile 238) wird angepasst, sodass sie -- genau wie die Web-App -- auch Transfer-Only-Tage beruecksichtigt:

1. Alle Daten (Session-Tage + Transfer-Only-Tage) in eine sortierte Liste zusammenfuehren
2. Fuer jeden Tag (mit oder ohne Session) die Bargeld-Berechnung durchfuehren
3. Transfers werden korrekt zugeordnet, auch wenn kein Session-Eintrag existiert

### Technische Aenderungen

Die `calculateCashBalance`-Funktion wird umgebaut:

```text
Vorher (vereinfacht):
  for (const session of sessions) {
    // Nur Tage MIT Session werden berechnet
    // Transfers ohne passende Session werden ignoriert
  }

Nachher:
  // 1. Session-Map nach Datum erstellen
  const sessionMap = new Map();
  for (const s of sessions) sessionMap.set(s.session_date, s);

  // 2. Transfer-Only-Tage finden
  const transferOnlyDates = new Set();
  for (const t of transfers) {
    if (!sessionMap.has(t.transfer_date)) transferOnlyDates.add(t.transfer_date);
  }

  // 3. Alle Daten sortiert durchlaufen
  const allDates = [...new Set([
    ...sessions.map(s => s.session_date),
    ...transferOnlyDates
  ])].sort();

  for (const date of allDates) {
    const session = sessionMap.get(date);
    // Session-Werte (oder 0 wenn kein Session)
    // + Transfer-Effekt fuer diesen Tag
    // = korrekte Bargeld-Berechnung
  }
```

Dies entspricht exakt der Logik in `useCashBalanceData.ts` (Zeilen 81-120), die bereits korrekt arbeitet.

### Erwartetes Ergebnis

Nach der Aenderung berechnet Telegram den gleichen Wechselgeldbestand wie die Web-App (2.000 EUR fuer Spicery am 21.02.).
