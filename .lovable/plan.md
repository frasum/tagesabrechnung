
# Plan: Kartenzahlungen-Bereich durch Trinkgeld-Pool-Übersicht ersetzen

## Übersicht

Der "Kartenzahlungen"-Bereich auf der rechten Seite hat keine praktische Funktion mehr, da Kartenzahlungen bereits als Summenfeld im Kellner-Formular erfasst werden. Dieser Bereich wird durch eine **Trinkgeld-Pool-Übersicht** ersetzt, die das Poolsystem visuell darstellt.

## Was ist der Trinkgeld-Pool?

Das System funktioniert so:
1. Jeder Kellner gibt mehr Bargeld ab als "erwartet" - der Überschuss (minus Küchen-Trinkgeld) ist sein **Beitrag zum Pool**
2. Alle Beiträge werden summiert = **Gesamtpool**
3. Der Pool wird **gleichmäßig** auf alle Kellner des Abends verteilt

---

## Neue "Trinkgeld Pool" Karte

Die neue Karte zeigt:

### Kopfbereich
- Titel: "Trinkgeld Pool" mit Users-Icon
- Kurze Erklärung: "Pool wird gleichmäßig auf alle Kellner verteilt"

### Inhalt (wenn Kellner vorhanden)

**Pool-Übersicht:**
- Anzahl Kellner im Pool
- Gesamtpool-Summe (prominent)
- Anteil pro Kellner (Pool ÷ Anzahl)

**Aufschlüsselung pro Kellner:**
| Name | Beitrag | Anteil |
|------|---------|--------|
| Max  | +15,00 € | 10,00 € |
| Lisa | +5,00 €  | 10,00 € |
| **Gesamt** | **20,00 €** | **20,00 €** |

Die "Beitrag"-Spalte zeigt, was jeder Kellner zum Pool beigesteuert hat.
Die "Anteil"-Spalte zeigt, was jeder Kellner vom Pool erhält (immer gleich).

### Leerzustand
Wenn noch keine Kellner erfasst sind: "Fügen Sie Kellner hinzu, um den Trinkgeld-Pool zu sehen."

---

## Technische Änderungen

### Datei: `src/pages/WaiterCashUp.tsx`

1. **Entfernen:**
   - Kartentransaktions-States und -Funktionen
   - Import und Verwendung von `useCardTransactions`, `useCreateCardTransaction`, `useDeleteCardTransaction`
   - Die gesamte "Kartenzahlungen"-Card (Zeilen 307-365)

2. **Hinzufügen:**
   - Neue "Trinkgeld Pool"-Card mit:
     - Pool-Statistiken (Anzahl Kellner, Gesamt, Pro Kopf)
     - Kompakte Tabelle mit Beitrag und Anteil pro Kellner
     - Farbcodierung: Grün für positive Beiträge, Rot für negative

3. **Betroffene Zeilen:**
   - Zeilen 33-35: Kartentransaktions-States entfernen
   - Zeilen 48-52: Hooks entfernen
   - Zeilen 128-163: Handler-Funktionen entfernen
   - Zeilen 307-365: Kartenzahlungen-Card durch Pool-Card ersetzen

---

## Vorteile

- Übersichtliche Darstellung des Trinkgeld-Systems
- Jeder Kellner sieht seinen Beitrag und seinen Anteil
- Keine ungenutzte Funktionalität mehr
- Konsistent mit dem bereits implementierten Pool-System
