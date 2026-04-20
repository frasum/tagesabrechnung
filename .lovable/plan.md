

# Fehlende Bankeinzahlungen für Spicery nachtragen

## Ziel
Übertrag aus Vormonat von aktuell **9.806,93 €** auf die tatsächlichen **866 €** reduzieren, indem die fehlenden historischen Bankeinzahlungen für Spicery in der Datenbank ergänzt werden.

## Berechnung
- Aktuelles Bargeld vor April 2026: **9.806,93 €**
- Gewünschter Übertrag: **866,00 €**
- → Fehlende Bankeinzahlungen gesamt: **8.940,93 €**

## Vorgehen
Eine einzelne Bankeinzahlung in `bank_deposits` für Spicery anlegen, die exakt die Differenz abdeckt:

| Feld | Wert |
|---|---|
| `restaurant_id` | (Spicery) |
| `deposit_date` | `2026-03-31` |
| `amount` | `8940.93` |
| `notes` | „Sammeleinzahlung historische Bestände (Korrektur)" |

Datum 31.03. gewählt, damit die Einzahlung **vor** April liegt und somit den Übertrag aus Vormonat reduziert, aber den März-Tagesbargeld-Verlauf nicht stört.

## Auswirkung
- „Übertrag aus Vormonat" für April 2026: **866,00 €** ✅
- „Verbleibendes Bargeld" und „Wechselgeldbestand" werden konsistent
- Tagesbargeld-Werte in der Tabelle bleiben unverändert
- Keine Code-Änderungen, keine DB-Schema-Änderungen — nur ein Daten-Insert

## Alternative (optional)
Falls du die Einzahlung lieber als mehrere realistische Beträge über Februar/März verteilt eintragen möchtest (statt einer Sammeleinzahlung), sag kurz Bescheid mit der gewünschten Aufteilung. Sonst wird ein einziger Eintrag am 31.03.2026 angelegt.

