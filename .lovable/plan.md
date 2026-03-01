

## Optische Verbesserungen für den Wochenplan

Basierend auf dem Screenshot sehe ich mehrere Möglichkeiten, die Tabelle professioneller und lesbarer zu gestalten:

### 1. Kompaktere Zeitfelder mit Trennzeichen
Aktuell nehmen Start/Ende-Felder viel Platz ein und haben keine visuelle Trennung. Vorschlag: Dezenter Punkt oder Strich zwischen Start und Ende pro Tag, um die Zuordnung klarer zu machen.

### 2. Abteilungs-Header visuell stärker absetzen
Die Abteilungs-Header (KÜCHE, GL, SERVICE) könnten mit einem farbigen Hintergrundstreifen und einem dickeren Border-Left versehen werden — konsistent mit der Buchhaltungs-Ansicht.

### 3. Totals-Spalte prominenter hervorheben
Die „Ges"-Spalte (Gesamtstunden) ist die wichtigste Summary-Info. Vorschlag: Fettere Schrift, leicht eingefärbter Hintergrund, klare linke Trennlinie (bereits teilweise vorhanden).

### 4. Leere Zeilen dezenter darstellen
Mitarbeiter ohne Schichten (z.B. GLAU, NET, MO) haben komplett leere Zeilen, die visuell gleichwertig sind. Vorschlag: Leere Zeilen leicht abgedunkelt oder die Gesamtstunden „0,00" in muted-Farbe, damit der Fokus auf Mitarbeiter mit Einträgen fällt.

### 5. Sonntags-/Feiertags-Spalten-Hervorhebung verfeinern
Der rote Hintergrund für Sonntag (So. 01.03) ist gut, könnte aber mit einem dezenteren Rosaton und einer oberen Border-Markierung eleganter wirken.

### 6. Hover-Effekt für Zeilen
Ein subtiler Hover-Effekt auf den Zeilen, damit man beim Navigieren besser sieht, in welcher Zeile man sich befindet.

### Änderungen

| Datei | Änderung |
|---|---|
| `src/index.css` | Neue CSS-Klassen: `.wochenplan-table .empty-row`, verfeinerte Sunday-Col-Farbe, Hover-Effekt, verbesserte Dept-Header-Styles |
| `src/pages/zeiterfassung/ZtWochenplan.tsx` | Empty-Row-Klasse auf Zeilen ohne Stunden anwenden, Dept-Header-Design angleichen an Buchhaltung, Zeitfeld-Separator (·) zwischen Start/Ende |

