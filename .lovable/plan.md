

# Plan: Excel-Layout für die Tagesabrechnung

## Ziel

Die "Tabellen"-Ansicht der Tagesabrechnung so anpassen, dass sie optisch dem vertrauten Excel-Formular entspricht. Die Manager erkennen sofort die gewohnte Struktur und können schneller arbeiten.

## Vergleich: Excel vs. aktuelle App

### Excel-Struktur (Tagesabrechnung.xlsm)

```text
┌─────────────────────────────────────┬─────────────────────────────────────────────────────────┐
│ spicery          Sat 07/02         │  joy cherry    │  anne         │  pon          │  ...  │
│─────────────────────────────────────│  abzugeben     │  abzugeben    │  abzugeben    │       │
│ GL               GH                │  2.144,30      │  2.183,50     │  2.356,70     │       │
│ Transaktionen    7.168,70          │  KK            │  KK           │  KK           │       │
│ Kellner Umsatz   7.168,70          │  1.861,66      │  2.358,71     │  2.097,86     │       │
│ Differenz        0,00              │  hilf mahl     │  hilf mahl    │  hilf mahl    │       │
│─────────────────────────────────────│  ...           │  ...          │  ...          │       │
│ Gutschein VK                       │  bargeld -100  │  bargeld -100 │  bargeld -100 │       │
│ Sonstige Einnahme                  │  458,00        │  25,00        │  469,50       │       │
│─────────────────────────────────────│  trinkgeld     │  trinkgeld    │  trinkgeld    │       │
│ KK gesamt        6.472,13          │  132 (8,2%)    │  157 (9,2%)   │  164 (8,9%)   │       │
│ KK Terminal 1    6.472,13          │                │               │               │       │
│ KK Terminal 2    0,00              ├─────────────────────────────────────────────────────────┤
│ KK Differenz     0,00              │  TIP GESAMT: 453                                        │
│─────────────────────────────────────│  Mitarbeiter: 4                                         │
│ OrderSmart       22,29             │  TIP pro Mitarbeiter: 113                               │
│ Wolt             308,40            ├─────────────────────────────────────────────────────────┤
│ Take Away gesamt                   │                                                         │
│─────────────────────────────────────│  ausgaben                                               │
│ Gutschein EL                       │  ____________________________________________            │
│ FineDine         100,00            │                                                         │
│ Offene Rechnungen 0,00             │                                                         │
│─────────────────────────────────────│                                                         │
│ Bargeld v. Service 366,27          │                                                         │
│ Vorschuss                          │                                                         │
│ Ausgaben         0,00              │                                                         │
│ Einladung                          │                                                         │
│─────────────────────────────────────│                                                         │
│ BARGELD          265,88            │                                                         │
│─────────────────────────────────────│                                                         │
│ 2% Tip Küche     133,69            │                                                         │
└─────────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

### Aktuelles Tabellen-Layout (App)

- Eine einzelne Eingabe-Tabelle
- Darunter separate Karten für Zusammenfassungen
- Kellner-Status als separate Karte am Ende

## Neues "Excel-Layout" Konzept

Ein fünftes Layout, das sich visuell eng am Excel-Original orientiert:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│  TAGESABRECHNUNG                                                            Sa, 08.02.2026     │
├──────────────────────────────────────┬──────────────────────────────────────────────────────────┤
│  HAUPTDATEN                          │  KELLNER                                                 │
│  ┌─────────────────┬────────────┐    │  ┌────────────┬────────────┬────────────┬────────────┐  │
│  │ Vectron Umsatz  │ [7.168,70] │    │  │ Joy Cherry │ Anne       │ Pon        │ ...        │  │
│  │ Kellner Umsatz  │  7.168,70  │    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  │ Differenz       │  0,00      │    │  │ Abzugeben  │ Abzugeben  │ Abzugeben  │            │  │
│  ├─────────────────┼────────────┤    │  │ 2.144,30   │ 2.183,50   │ 2.356,70   │            │  │
│  │ KK Terminal 1   │ [6.472,13] │    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  │ KK Terminal 2   │ [    0,00] │    │  │ KK         │ KK         │ KK         │            │  │
│  │ KK GL           │ [  153,90] │    │  │ 1.861,66   │ 2.358,71   │ 2.097,86   │            │  │
│  │ KK Gesamt       │  6.626,03  │    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  ├─────────────────┼────────────┤    │  │ Hilf Mahl  │ Hilf Mahl  │ Hilf Mahl  │            │  │
│  │ Takeaway GL     │ [  484,20] │    │  │ 0,00       │ 0,00       │ 0,00       │            │  │
│  │ OrderSmart      │ [   22,29] │    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  │ Wolt            │ [  308,40] │    │  │ Offen      │ Offen      │ Offen      │            │  │
│  │ Take-Away ges.  │    814,89  │    │  │ 0,00       │ 0,00       │ 0,00       │            │  │
│  ├─────────────────┼────────────┤    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  │ Gutschein VK    │ [    0,00] │    │  │ Bargeld    │ Bargeld    │ Bargeld    │            │  │
│  │ Gutschein EL    │ [    0,00] │    │  │ 458,00     │ 25,00      │ 469,50     │            │  │
│  │ FineDine        │ [  100,00] │    │  ├────────────┼────────────┼────────────┼────────────┤  │
│  ├─────────────────┼────────────┤    │  │ Küchen-TG  │ Küchen-TG  │ Küchen-TG  │            │  │
│  │ Offene Rechn.   │      0,00  │    │  │ 132 (8,2%) │ 157 (9,2%) │ 164 (8,9%) │            │  │
│  │ Vorschuss       │ [    0,00] │    │  └────────────┴────────────┴────────────┴────────────┘  │
│  │ Einladung       │ [    0,00] │    │                                                         │
│  │ Sonstige Einn.  │ [    0,00] │    │                                                         │
│  │ Ausgaben        │ -    0,00  │    │                                                         │
│  ├─────────────────┼────────────┤    │                                                         │
│  │ BARGELD         │    265,88  │    │                                                         │
│  ├─────────────────┼────────────┤    ├──────────────────────────────────────────────────────────┤
│  │ 2% Küchen-TG    │    133,69  │    │  TIP POOL                                                │
│  │ Küche (4 MA)    │     33,42  │    │  ┌───────────────────────────────────────────────────┐  │
│  └─────────────────┴────────────┘    │  │ TIP Gesamt: 453,00 €                              │  │
│                                      │  │ Service MA: 4 → 113,25 € pro Person               │  │
│  AUSGABEN                            │  │ Küche MA: 4 → 33,42 € pro Person                  │  │
│  ┌──────────────────────────────┐    │  └───────────────────────────────────────────────────┘  │
│  │ [Beschreibung    ] [0,00] [+]│    │                                                         │
│  │ ...                          │    │  NOTIZEN                                                │
│  └──────────────────────────────┘    │  ┌───────────────────────────────────────────────────┐  │
│                                      │  │ _________________________________________________ │  │
│                                      │  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────┴──────────────────────────────────────────────────────────┘
```

## Design-Prinzipien des Excel-Layouts

1. **Zwei-Spalten-Hauptstruktur**: Hauptdaten links, Kellner-Tabelle rechts
2. **Horizontale Kellner-Darstellung**: Kellner nebeneinander (nicht untereinander)
3. **Kompakte Zeilen**: Weniger Padding, mehr Daten pro Bildschirm
4. **Eingaben vs. Berechnungen**: Eingabefelder `[in Klammern]`, berechnete Werte normal
5. **Gruppierung durch Linien**: Horizontale Trennlinien statt Karten
6. **Hervorgehobenes BARGELD**: Der Endwert prominent dargestellt

## Neue Komponenten

| Komponente | Beschreibung |
|------------|--------------|
| `ExcelLayout.tsx` | Neues Layout in zwei Spalten mit horizontaler Kellner-Tabelle |

## Umsetzungsschritte

### 1. Neue Layout-Komponente erstellen

- `src/components/daily-summary/layouts/ExcelLayout.tsx`
- Zwei Spalten: "Hauptdaten" links, "Kellner & Trinkgeld" rechts
- Horizontale Tabelle für Kellner (Namen als Spaltenköpfe)
- Kompaktes Styling mit weniger Padding

### 2. Layout-Switcher erweitern

- Neues Icon: `FileSpreadsheet` (Lucide)
- Fünftes Layout: "Excel" mit Tooltip "Excel-Stil"

### 3. Kellner-Daten als Props

Die Kellner-Daten (`waiterShifts`) müssen ans Layout weitergegeben werden, damit die horizontale Tabelle erstellt werden kann.

## Technische Details

### Horizontale Kellner-Tabelle

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-24"></TableHead>
      {waiterShifts.map(w => (
        <TableHead key={w.id} className="text-center min-w-[100px]">
          {w.waiter_name}
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">Abzugeben</TableCell>
      {waiterShifts.map(w => (
        <TableCell key={w.id} className="text-right tabular-nums">
          {formatCurrency(w.kassiert_brutto)}
        </TableCell>
      ))}
    </TableRow>
    <TableRow>
      <TableCell className="font-medium">KK</TableCell>
      {waiterShifts.map(w => (
        <TableCell key={w.id} className="text-right tabular-nums">
          {formatCurrency(w.card_total)}
        </TableCell>
      ))}
    </TableRow>
    {/* ... weitere Zeilen */}
  </TableBody>
</Table>
```

### Styling-Anpassungen

```css
/* Kompaktere Zeilen */
.excel-row td {
  @apply py-1.5 text-sm;
}

/* Hervorgehobenes Bargeld */
.bargeld-row {
  @apply bg-primary/10 font-bold text-lg;
}

/* Eingabefelder visuell unterscheiden */
.input-cell input {
  @apply border-primary/30 bg-primary/5;
}
```

## Dateiänderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/components/daily-summary/layouts/ExcelLayout.tsx` | Erstellen | Neues Excel-ähnliches Layout |
| `src/components/daily-summary/layouts/index.ts` | Bearbeiten | Export hinzufügen |
| `src/components/daily-summary/LayoutSwitcher.tsx` | Bearbeiten | "Excel"-Option hinzufügen |
| `src/pages/DailySummary.tsx` | Bearbeiten | ExcelLayout einbinden, waiterShifts weitergeben |

## Erwartetes Ergebnis

- Ein neues fünftes Layout "Excel" im Layout-Umschalter
- Optisch erkennbar am bekannten Excel-Formular orientiert
- Kellner horizontal nebeneinander statt in separaten Karten
- Kompakte Darstellung mit weniger Whitespace
- "BARGELD" prominent hervorgehoben
- Einfacher Umstieg für Manager, die das Excel-Formular gewohnt sind

