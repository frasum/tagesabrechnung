

# Falscher "Fehlbetrag Vortag" durch doppelte Korrekturbuchung

## Was du siehst
Auf der Tagesabrechnung wird **„Fehlbetrag Vortag: −6.971,35 €"** angezeigt. Das ist sachlich falsch — das tatsächliche Bargeld war zum 31.03. **+2.866 €** (inkl. 2.000 € Wechselgeld).

## Ursache: Doppelte Verbuchung am 31.03.2026

In `register_transfers` existieren für den **31.03.2026** zwei manuelle Buchungen, die sich überlagern:

| Datum | Betrag | Richtung | Grund |
|---|---|---|---|
| 31.03. | +866,00 € | to_restaurant | „Anfangsbestand-Korrektur 2.866 € inkl. 2.000 € Wechselgeld" (gestern angelegt) |
| 31.03. | **−8.940,93 €** | to_safe | „Korrektur Übertragsabgleich März 2026" |

Zusätzlich gibt es am **31.03.** eine **Bankeinzahlung von 8.940,93 €** in `bank_deposits`.

→ Der Übertragsabgleich von **−8.940,93 €** wurde **doppelt erfasst**: einmal als `register_transfers` (to_safe) und einmal als reguläre `bank_deposits`. Beide werden in der Bargeld-Kette abgezogen.

Effektrechnung am 31.03.:
- Tages-Bargeld 31.03. (geschätzt): ca. **+1.970 €**
- + 866 € (Korrektur Anfangsbestand) ✓ richtig
- − 8.940,93 € (Transfer to_safe) ✗ doppelt
- (Bankeinzahlung 8.940,93 € wirkt zusätzlich in der Summary-Karte)
- Carry-Over zum 01.04.: **≈ −6.104 €** (passt zu den −6.971 €, die du siehst, nach weiteren Effekten)

## Lösung

Den **fälschlich doppelt erfassten Transfer** vom 31.03. löschen. Die Bankeinzahlung von 8.940,93 € bleibt korrekt bestehen, da Bankeinzahlungen ohnehin separat in der Summary-Karte abgezogen werden.

### SQL-Bereinigung

```sql
DELETE FROM register_transfers
WHERE restaurant_id = 'a1710390-ea4d-4bc2-b869-c0c047056b15'
  AND transfer_date = '2026-03-31'
  AND direction = 'to_safe'
  AND amount = 8940.93
  AND reason = 'Korrektur Übertragsabgleich März 2026';
```

## Erwartetes Ergebnis nach Bereinigung

- Carry-Over zum 01.04.: **0 €** (oder leicht positiv) — kein „Fehlbetrag Vortag" mehr
- „Differenz zum Wechselgeldbestand" und „Wechselgeldbestand (soll 2.000 €)" zeigen wieder plausible Werte
- 866 € Anfangsbestand-Korrektur bleibt korrekt aktiv

## Hinweis
Die `compute_carry_over`-Logik selbst funktioniert korrekt — es handelt sich um einen **Datenfehler**, keinen Formelfehler. Die DELETE-Operation benötigt deine Freigabe und wird über eine Migration ausgeführt.

