

## Durchschnittsverzehr: Takeaway-Umsatz abziehen

### Was sich aendert

Die Berechnung des Durchschnittsverzehrs pro Gast wird von:

```text
pos_total / guest_count
```

geaendert zu:

```text
(pos_total - takeaway_total) / guest_count
```

Damit wird nur der In-House-Umsatz beruecksichtigt, da Takeaway-Kunden keine Gaeste im Haus sind.

### Betroffene Stellen

**1. Tagesabrechnung (ExcelLayout.tsx, Zeile 175)**
- Aktuell: `formData.pos_total / guestCount`
- Neu: `(formData.pos_total - (formData.takeaway_total || 0)) / guestCount`

**2. PDF-Export (pdfExport.ts, Zeile 159)**
- Aktuell: `(data.session.pos_total || 0) / data.session.guest_count!`
- Neu: `((data.session.pos_total || 0) - (data.session.takeaway_total || 0)) / data.session.guest_count!`

**3. Telegram-Bericht (send-telegram-summary/index.ts, Zeile 128)**
- Aktuell: `posTotal / session.guest_count`
- Neu: `(posTotal - (session.takeaway_total || 0)) / session.guest_count`

### Keine Datenbank-Aenderungen noetig
Alle benoetigten Felder (pos_total, takeaway_total, guest_count) sind bereits vorhanden.
