

# register_transfers in die Bargeld-Berechnung integrieren

## Zusammenfassung

Der "Kassenbestand" in der Tagesabrechnung soll den **Wechselgeldbestand** widerspiegeln -- also idealerweise 2.000 EUR. Aktuell kann er darunter liegen, weil negative Tage den Bestand druecken und die bestehenden Korrekturbuchungen in `register_transfers` vom Code ignoriert werden.

Die Loesung: `register_transfers` in die Berechnung einbinden. Danach greifen die bereits vorhandenen Korrekturbuchungen (542,43 EUR fuer YUM, 768,72 EUR fuer Spicery vom 15.02.), und der Kassenbestand sollte auf 2.000 EUR kommen. Falls nicht exakt, werden die Betraege angepasst.

## Was sich aendert

**Eine Datei**: `src/hooks/useCashBalanceData.ts`

Die Aenderung besteht aus zwei Teilen:

1. **Laden der register_transfers**: Zusaetzliche Abfrage an die `register_transfers`-Tabelle fuer das Restaurant
2. **Einrechnung pro Tag**: Nach der Bargeld-Berechnung jeder Session werden Transfers desselben Datums addiert (`to_restaurant` = plus) oder abgezogen (`to_safe` = minus), bevor das Deficit Chaining greift

## Was sich NICHT aendert

- Die Skimming-Logik in `useRemainingCash.ts` bleibt exakt gleich
- Bankeinzahlungen bleiben unberuehrt
- Kein neues UI noetig
- Keine neuen Datenbank-Eintraege noetig (Korrekturbuchungen existieren bereits)

## Technisches Detail

```text
Aktuelle Berechnung pro Tag:
  rawBargeld = Umsatz + GutscheineVK + Sonstige - Abzuege
  bargeld = rawBargeld + carryOver

Neue Berechnung pro Tag:
  rawBargeld = Umsatz + GutscheineVK + Sonstige - Abzuege
  transferEffect = SUM(to_restaurant) - SUM(to_safe) fuer diesen Tag
  bargeld = rawBargeld + transferEffect + carryOver
```

## Verifikation

Nach der Code-Aenderung wird geprueft, ob der Kassenbestand fuer beide Restaurants exakt 2.000 EUR betraegt. Falls die bestehenden Korrekturbuchungen nicht ausreichen, werden die Betraege in der Datenbank angepasst.

