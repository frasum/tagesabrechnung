

## Taegliche Bargeld-Uebersicht in Telegram-Nachricht

### Was sich aendert

Die Telegram-Nachricht wird pro Restaurant um eine kompakte **Bargeld-Aufschluesselung** fuer den jeweiligen Tag erweitert. Das ist die gleiche Information, die in der Tabelle auf der Bargeldbestand-Seite angezeigt wird.

### Beispiel-Nachricht (neuer Abschnitt)

```
*Yum:*
  Vectron: 3.500,00 €
  Kassenbestand: 2.000,00 €

  Bargeld-Details:
  Kreditkarten: -1.200,00 €
  OrderSmart: -150,00 €
  Wolt: -80,00 €
  Gutsch. EL: -50,00 €
  Gutsch. VK: +30,00 €
  Einladung: -20,00 €
  Offene RE: -45,00 €
  Vorschuss: -100,00 €
  Ausgaben: -60,00 €
  ➜ Bargeld: 1.825,00 €
```

### Technische Aenderungen

**Datei: `supabase/functions/send-telegram-summary/index.ts`**

1. Neuen Toggle `show_cash_details` zur Settings-Logik hinzufuegen (Standard: `true`)
2. Im Restaurant-Loop fuer den Zieldatum die gleichen Werte berechnen wie `useCashBalanceData`:
   - Kreditkarten, OrderSmart, Wolt, Gutscheine EL/VK, Einladung, Offene RE, Vorschuss, Ausgaben
   - Deficit Chaining bis zum Zieldatum anwenden
3. Diese Werte als kompakte Liste in die Nachricht einfuegen (nur wenn `show_cash_details` aktiv)

**Datei: `src/pages/TelegramSettings.tsx`**

4. Neuen Toggle "Bargeld-Details" in die Einstellungs-Seite aufnehmen

**Datei: `src/hooks/useTelegramSettings.ts`**

5. `show_cash_details` zum Interface und zur Save-Logik hinzufuegen

**Datenbank-Migration:**

6. Neue Spalte `show_cash_details boolean default true` zur Tabelle `telegram_settings` hinzufuegen

