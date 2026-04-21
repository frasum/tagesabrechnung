

# Spicery: Übertrag aus Vormonat auf +866 € setzen

## Aktueller Stand
- Spicery, April 2026: Übertrag = **0,00 €**
- Gewünscht: **+866,00 €**

## Ursache
`compute_carry_over` überträgt nur **negative** Salden (Defizit-Chaining). Positive Tagessalden werden auf 0 zurückgesetzt — daher kommt im April nichts an, obwohl rechnerisch Bargeld übrig war.

## Lösungsansatz (zwei Schritte)

### Schritt 1 — DB-Funktion erweitern
`compute_carry_over` so anpassen, dass **sowohl negative als auch positive** Salden übertragen werden:

```sql
v_carry_over := v_bargeld;  -- statt: CASE WHEN v_bargeld < 0 THEN v_bargeld ELSE 0 END
```

**Auswirkung auf alle Restaurants**:
- YUM: bleibt bei −141,00 € (Wert ist negativ, also unverändert)
- Spicery: zeigt den realen kumulierten Saldo aus allen historischen Sessions, Bankeinzahlungen und Tresor-Transfers

### Schritt 2 — Korrekturbuchung für Spicery
Da der reale historische Saldo vermutlich nicht exakt 866 € ergibt (wegen fehlender Bankeinzahlungen/Transfers in der Vergangenheit), wird ein **`register_transfers`-Eintrag** auf den 31.03.2026 gebucht, der den Saldo punktgenau auf +866 € einstellt:

| Feld | Wert |
|---|---|
| restaurant_id | `a1710390-…` (Spicery) |
| transfer_date | `2026-03-31` |
| direction | `from_restaurant` (verringert) **oder** `to_restaurant` (erhöht), je nach errechnetem Ist-Saldo |
| amount | Differenz zwischen errechnetem Ist-Saldo und 866 € |
| reason | „Korrektur Übertragsabgleich März 2026" |
| created_by_name | `System` |

Der genaue Betrag/Richtung wird **nach** der Funktionsänderung berechnet, indem `compute_carry_over('spicery', '2026-04-01')` erneut aufgerufen wird.

### Schritt 3 — Memory aktualisieren
`mem://features/cash-reconciliation/core-logic` anpassen: „Cumulative Deficit Chaining" → **„Cumulative Balance Chaining"** (positive UND negative Salden werden übertragen).

## Ergebnis
- Spicery, April 2026: **+866,00 €** Übertrag aus Vormonat
- YUM, April 2026: **−141,00 €** (unverändert)
- Künftig zeigt der Übertrag den realen kumulierten Bargeldbestand — auch wenn er positiv ist.

## Hinweis / Konsequenz
Mit dieser Änderung akkumulieren positive Bargeldbestände sichtbar über Monate. Wenn das Restaurant Bargeld physisch zur Bank bringt oder in den Tresor überträgt, **muss** dies künftig als Bankeinzahlung oder Tresor-Transfer erfasst werden, sonst wächst der Übertrag dauerhaft an. Das war bisher implizit „verziehen", weil positive Salden sowieso verworfen wurden.

## Keine weiteren Änderungen
- Keine UI-Änderung
- Keine Änderung an Tageszeilen-Berechnung

