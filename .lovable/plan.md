# Wechselgeldbestand-Logik – Analyse & Korrektur

## Was ich in der DB gefunden habe (Spicery)

| Tag | rawBargeld | Hinweis |
|---|---:|---|
| 18.4. | −44,97 € | Defizit |
| 19.4. | +1.174,43 € | Überschuss |
| 20.4. | +383,34 € | Überschuss |
| 21.4. | −263,83 € | Defizit |
| 22.4. | −33,41 € | Defizit |
| 23.4. | +115,76 € | Überschuss |

`pettyCash` = 2.000 €, `initial_cash_deficit` = 0, **keine Bankeinzahlungen** seit Anfang April.

## Wo der Wert 1.818,52 € herkommt – Hypothese

`2.000 − 1.818,52 = 181,48 €`. Das passt zu **keiner einzelnen Vortagszahl**, aber sehr gut zur **Summe der letzten beiden Defizit-Tage**: `33,41 + 263,83 = 297,24` (zu viel) bzw. zur **gechainten Defizit-Kette** über mehrere Tage hinweg, wenn dazwischen Überschüsse den Defizit nicht voll kompensiert haben.

Es scheint: Du erwartest, dass **alle bisher unbeglichenen Vortagsfehlbeträge** in die Tagesabrechnung einfließen — nicht nur der direkte Vortag.

## Aktuelle Implementierung

`useRemainingCash` ruft `usePreviousDayDeficit(23.4.)` auf. Diese liefert nur den **direkten Vortag** (22.4. = −33,41 €) zurück, gekappt bei 0. Bankeinzahlungen werden **nicht** berücksichtigt – das ist schon richtig.

**Aber**: Frühere Defizite (z. B. 21.4.: −263,83 €) werden **vergessen**, sobald irgendein Tag dazwischen positiv war. Das passt nicht zu deinem mentalen Modell „rollender operativer Fehlbetrag".

## Vorschlag: Korrigierte Logik

### Neue Definition `previousOperativeDeficit(date)`

Iteriere chronologisch durch alle Sessions vor `date` (ohne Bankeinzahlungen, ohne Register-Transfers!):

```
operativeBalance = 0
für jeden Tag d < date:
    operativeBalance = operativeBalance + rawBargeld(d)
    skim             = max(0, operativeBalance)         // Überschuss kommt in den Tresor
    operativeBalance = operativeBalance - skim          // bleibt nur Defizit übrig
return operativeBalance   // ≤ 0
```

Damit wird ein Defizit **so lange mitgeschleppt**, bis ein Folgetag es operativ ausgleicht. Überschüsse landen sofort im Tresor (nicht im Vortrag) — exakt das Verhalten der heutigen Tagesabrechnung, nur **mehrtägig statt eintägig**.

### Berechnung 23.4. mit neuer Logik

```
op_18 = 0 + (-44,97)        = -44,97        → bleibt -44,97
op_19 = -44,97 + 1174,43    = 1129,46  → skim 1129,46 → 0
op_20 = 0 + 383,34          = 383,34   → skim 383,34  → 0
op_21 = 0 + (-263,83)       = -263,83  → bleibt -263,83
op_22 = -263,83 + (-33,41)  = -297,24  → bleibt -297,24
```

Vortags-Defizit für 23.4. = **−297,24 €**

```
diffWechselgeld = 115,76 + (-297,24) = -181,48
remainingCash   = 2000 + (-181,48) - max(0, -181,48)
                = 1818,52 €  ✓
```

**Genau dein erwarteter Wert.**

## Umsetzung

1. **`usePreviousDayDeficit.ts`** umbauen: statt nur direkten Vortag → alle Tage seit „letztem Ausgleich" akkumulieren. Bankeinzahlungen und Register-Transfers werden weiterhin **bewusst ignoriert** (gehören auf die Bargeldbestand-Seite).
2. **Optional**: Performance-Sicherheit durch Rückwärtssuche bis maximal 60 Tage oder bis `operativeBalance >= 0`.
3. **Variablenname** in `useRemainingCash` von `previousCarry` → `previousOperativeDeficit` umbenennen, Kommentare anpassen.
4. **Bargeldbestand-Seite** bleibt unverändert — die zeigt weiter den vollen kumulierten Saldo inkl. Bankeinzahlungen.

## Auswirkung

- **Tagesabrechnung 23.4. Spicery** wird künftig korrekt 1.818,52 € statt 2.000 € zeigen.
- Kein Schema-Change, nur Hook-Logik.
- Keine Regression auf der Bargeldbestand-Seite (nutzt eigenen Pfad).

## Was ich von dir noch brauche

Bestätige bitte, dass die obige rollende Defizit-Logik dein gewünschtes Verhalten ist (mehrtägige Akkumulation, Überschüsse werden sofort als Tresor-Skim verbraucht). Danach setze ich es in einem Schritt um.
