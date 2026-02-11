

# Telegram-Zusammenfassung erweitern: Kassenbestand und Kuechenteam

## Was sich aendert

Die taegliche Telegram-Nachricht wird um zwei Informationen pro Restaurant ergaenzt:

1. **Kassenbestand** -- der kumulative Bargeldbestand bis zum jeweiligen Datum
2. **Kueche** -- Liste der Kuechenmitarbeiter, die an dem Tag gearbeitet haben (mit Stunden)

## Beispiel-Nachricht (vorher vs. nachher)

**Vorher:**
```
Restaurant XY:
  Vectron: 3.450,00 EUR
  Erstellt von: Gerard

  Kellner:
  - Max: 1.200,00 EUR (Abgabe: 23:15)
  - Lisa: 980,00 EUR (Abgabe: 22:50)
```

**Nachher:**
```
Restaurant XY:
  Vectron: 3.450,00 EUR
  Kassenbestand: 12.340,50 EUR
  Erstellt von: Gerard

  Kellner:
  - Max: 1.200,00 EUR (Abgabe: 23:15)
  - Lisa: 980,00 EUR (Abgabe: 22:50)

  Kueche:
  - Ali (10:00-22:00, 12h)
  - Marco (11:00-20:00, 9h)
```

## Technische Umsetzung

### Aenderung: `supabase/functions/send-telegram-summary/index.ts`

Fuer jedes Restaurant werden zwei zusaetzliche Abfragen gemacht:

**Kassenbestand-Berechnung (im Edge Function):**
- Alle Sessions des Restaurants bis zum Zieldatum laden
- Pro Session die zugehoerigen waiter_shifts (open_invoices), expenses und advances laden
- Bargeld pro Tag berechnen nach der bestehenden Formel:
  `Vectron + Gutschein-VK - Kreditkarten - OrderSmart - Wolt - Gutschein-EL - FineDine - Einladung - offeneRE - Vorschuss - Ausgaben`
- Alle Tageswerte summieren
- Wechselgeld (petty_cash) aus der settings-Tabelle addieren
- Ergebnis als "Kassenbestand" in die Nachricht einfuegen

**Kuechenteam:**
- `kitchen_shifts` Tabelle abfragen fuer die jeweilige Session
- Name, Schichtzeiten und Stunden auflisten

### Keine weiteren Dateien betroffen
Die Aenderung beschraenkt sich ausschliesslich auf die Edge Function. Es sind keine Datenbank-Aenderungen oder Frontend-Aenderungen noetig.

