

# KI-Chat: Erweiterte Analysen und proaktive Anomalie-Erkennung

## Neue Fähigkeiten

### 1. Zahlungsarten – Bar vs. Karte
**Bereits verfügbare Daten**: Sessions haben `pos_total`, `terminal_1_total`, `terminal_2_total`. Waiter-Shifts haben `card_total`, `cash_handed_in`.
**Umsetzung**: Neuer aggregierter Kontext-Abschnitt `ZAHLUNGSARTEN PRO MONAT` mit:
- Monat | Restaurant | Gesamt-Umsatz | Kreditkarten | Bar-Anteil | Karten-Anteil-%

Die Kreditkarten-Summe ist bereits in `monthlyAgg.kreditkarten` vorhanden. Bar = `pos_total - kreditkarten`. Prozentanteile werden berechnet.

### 2. Mitarbeiter-Performance – Umsatz pro Kellner pro Stunde
**Bereits verfügbare Daten**: `waiterHoursAgg` (Stunden) und Waiter-Shifts haben `pos_sales`.
**Umsetzung**: Neuer Abschnitt `KELLNER-PERFORMANCE PRO MONAT`:
- Monat | Restaurant | Kellner | Umsatz | Stunden | €/Stunde | Ø Umsatz/Schicht | Schichten

Erfordert zusätzliche Aggregation von `pos_sales` und Schichtanzahl pro Kellner.

### 3. Wetterkorrelation
**Keine Wetterdaten vorhanden** — kein externer API-Zugang in der Edge Function sinnvoll (Latenz, Kosten).
**Umsetzung**: Statt Wetter-API wird dem System-Prompt eine Anweisung gegeben, dass Wetterdaten nicht verfügbar sind und der Assistent stattdessen auf saisonale Muster, Wochentags-Vergleiche und Gästezahlen-Schwankungen hinweisen soll als Proxy-Indikatoren.

### 4. Restaurant-Benchmarking (Spicery vs. YUM)
**Bereits verfügbare Daten**: Alle monatlichen Aggregationen sind bereits nach Restaurant getrennt.
**Umsetzung**: Neuer Abschnitt `RESTAURANT-VERGLEICH PRO MONAT`:
- Monat | Kennzahl | Restaurant-A | Restaurant-B | Differenz | Differenz-%

Vergleicht automatisch die Restaurants nebeneinander: Umsatz, Gäste, Ø Umsatz/Gast, Kreditkarten-Anteil, Küchen-TG, Ausgaben.

### 5. Proaktive Anomalie-Erkennung
**Umsetzung**: Serverseitige Berechnung von Anomalien als neuer Kontext-Abschnitt `AKTUELLE ANOMALIEN UND AUFFÄLLIGKEITEN`. Folgende Checks:

1. **Wochenvergleich Umsatz**: Letzte 7 Tage vs. vorherige 7 Tage → melden wenn >15% Abweichung
2. **Kellner-Abweichungen**: Ø Umsatz/Stunde eines Kellners vs. Team-Durchschnitt → melden wenn >30% unter Durchschnitt
3. **Ungewöhnlich hohe Differenzen**: Kellner mit auffällig hohen negativen Differenzen (> 2× Standardabweichung)
4. **Gästezahl-Trends**: Letzte Woche vs. Vorwoche
5. **Fehlende Tage**: Tage ohne Abrechnung in den letzten 7 Tagen (außer Ruhetage)

Format:
```text
=== AKTUELLE ANOMALIEN UND AUFFÄLLIGKEITEN ===
⚠ Umsatz letzte Woche (Spicery): 12.340€ — 18% unter Vorwoche (15.050€)
⚠ Kellner X: Ø 48€/h — 35% unter Team-Ø (74€/h) in den letzten 7 Tagen
ℹ Gästezahl YUM: +12% gegenüber Vorwoche
```

## System-Prompt Ergänzungen

Neue Regeln:
- Zahlungsarten-Tabelle für Bar/Karte-Fragen nutzen
- Kellner-Performance für Umsatz/Stunde-Fragen nutzen
- Restaurant-Vergleich für Benchmarking-Fragen nutzen
- Anomalien proaktiv erwähnen wenn relevant (z.B. bei allgemeinen "Wie läuft's?"-Fragen)
- Bei Wetter-Fragen: Erklären, dass keine Wetterdaten verfügbar sind, aber saisonale Muster und Gästezahlen als Indikatoren anbieten

## Technische Umsetzung

**Eine Datei**: `supabase/functions/restaurant-chat/index.ts`

Neue Berechnungsblöcke nach den bestehenden Aggregationen:
1. Zahlungsarten-Aggregation (aus bestehender `monthlyAgg`)
2. Kellner-Performance-Aggregation (neues `waiterPerfAgg` mit `pos_sales` + Schichtcount)
3. Restaurant-Vergleich (Cross-Join der bestehenden Monatsdaten)
4. Anomalie-Erkennung (letzte 7 Tage vs. vorherige 7 Tage aus Sessions + Shifts)

Keine neuen DB-Queries nötig — alle benötigten Daten sind bereits geladen. Nur zusätzliche Aggregations-Logik und Kontext-Abschnitte.

