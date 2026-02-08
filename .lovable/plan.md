
## Wechselgeldbestand - Kassentransfer-Tracking

### Übersicht
Neuer Navigationsbereich "Wechselgeldbestand" zum Tracken von Bargeld-Bewegungen zwischen zwei Kassen:
- **Tresor (unten)**: €1.000 Startbestand  
- **Restaurant-Kasse (oben)**: €1.000 Startbestand

Wenn die Restaurant-Kasse ins Minus geht (z.B. durch viele Kartenzahlungen bei gleichzeitiger Trinkgeld-Auszahlung), wird Geld vom Tresor nach oben transferiert. Diese Transfers werden dokumentiert.

### Startbestand-Logik
- Das **Gesamtwechselgeld** (€2.000) wird aus der bestehenden `petty_cash` Einstellung übernommen
- **Initial** wird dies 50/50 auf beide Kassen aufgeteilt (je €1.000)
- Bei jedem Transfer ändert sich der Bestand beider Kassen entsprechend

### Datenbankänderungen

**Neue Tabelle: `register_transfers`**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid | Primary Key |
| restaurant_id | uuid | FK zu restaurants |
| transfer_date | date | Datum des Transfers |
| amount | numeric | Transferbetrag (immer positiv) |
| direction | text | 'to_restaurant' (Tresor → Restaurant) oder 'to_safe' (Restaurant → Tresor) |
| reason | text | Optional: Grund für Transfer |
| created_at | timestamp | Erstellungszeitpunkt |

**Neue Einstellungen in `settings` Tabelle:**

| Key | Value-Struktur | Beschreibung |
|-----|----------------|--------------|
| register_config | `{ safe_amount: 1000, restaurant_amount: 1000 }` | Anfangsbestände der beiden Kassen |

### Berechnungslogik

```text
┌─────────────────────────────────────────────────────────────┐
│  TRESOR (unten)                                             │
├─────────────────────────────────────────────────────────────┤
│  Anfangsbestand:                          €1.000,00         │
│  − Transfers an Restaurant:               -€ 300,00         │
│  + Rücktransfers vom Restaurant:          +€  50,00         │
│  ─────────────────────────────────────────────────          │
│  Aktueller Bestand:                       €  750,00         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  RESTAURANT-KASSE (oben)                                    │
├─────────────────────────────────────────────────────────────┤
│  Anfangsbestand:                          €1.000,00         │
│  + Transfers vom Tresor:                  +€ 300,00         │
│  − Rücktransfers an Tresor:               -€  50,00         │
│  ─────────────────────────────────────────────────          │
│  Aktueller Bestand:                       €1.250,00         │
└─────────────────────────────────────────────────────────────┘

Kontrolle: €750 + €1.250 = €2.000 (= petty_cash gesamt) ✓
```

### Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/pages/RegisterBalance.tsx` | Hauptseite "Wechselgeldbestand" |
| `src/hooks/useRegisterTransfers.ts` | Hook für Transfer-Operationen |
| `src/components/register/RegisterCard.tsx` | Karten für Tresor/Restaurant-Kasse |
| `src/components/register/TransferDialog.tsx` | Dialog zum Erfassen eines Transfers |
| `src/components/register/TransferList.tsx` | Liste aller Transfers |

### Zu ändernde Dateien

| Datei | Änderung |
|-------|----------|
| `src/App.tsx` | Neue Route `/register-balance` hinzufügen |
| `src/components/layout/AppLayout.tsx` | Neuer Nav-Eintrag + zur Manager-Whitelist |
| `src/types/permissions.ts` | Neue Permission definieren |

### UI-Design der Seite

```text
┌──────────────────────────────────────────────────────────────────────┐
│  🪙 Wechselgeldbestand                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐     ┌─────────────────────────┐        │
│  │  🏦 TRESOR              │     │  🏪 RESTAURANT-KASSE    │        │
│  │  (Keller)               │     │  (oben)                 │        │
│  │                         │     │                         │        │
│  │  Anfang:    €1.000,00   │     │  Anfang:    €1.000,00   │        │
│  │  Transfers: -€ 300,00   │     │  Transfers: +€ 300,00   │        │
│  │  ──────────────────     │     │  ──────────────────     │        │
│  │  Aktuell:   €  700,00   │     │  Aktuell:   €1.300,00   │        │
│  │                         │     │                         │        │
│  └─────────────────────────┘     └─────────────────────────┘        │
│                                                                      │
│                    ⬆️ Transfer zum Restaurant                        │
│                    ⬇️ Transfer zum Tresor                            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Transfer-Verlauf                                    [+ Neu]         │
│                                                                      │
│  15.01.2025  €150,00  Tresor → Restaurant   "Trinkgeld Auszahlung"  │
│  12.01.2025  €100,00  Tresor → Restaurant   "Wenig Bargeldeingang"  │
│  05.01.2025  € 50,00  Restaurant → Tresor   "Überschuss zurück"     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Transfer-Dialog

```text
┌─────────────────────────────────────────────┐
│  Transfer erfassen                      ✕   │
├─────────────────────────────────────────────┤
│                                             │
│  Richtung:                                  │
│  ○ Tresor → Restaurant-Kasse                │
│  ● Restaurant-Kasse → Tresor                │
│                                             │
│  Datum:        [  08.02.2026  ]            │
│                                             │
│  Betrag:       [  150,00 €    ]            │
│                                             │
│  Grund:        [  Trinkgeld Auszahlung   ] │
│                (optional)                   │
│                                             │
├─────────────────────────────────────────────┤
│            [Abbrechen]  [Speichern]         │
└─────────────────────────────────────────────┘
```

### Navigation

Manager sehen den neuen Bereich **immer** (wird zur Whitelist hinzugefügt):

```typescript
const alwaysVisibleForManager = ['', 'manager', 'kitchen', 'summary', 'register-balance'];
```

### Technische Details

**Migration SQL:**
```sql
-- Neue Tabelle für Kassentransfers
CREATE TABLE register_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  transfer_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL CHECK (direction IN ('to_restaurant', 'to_safe')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE register_transfers ENABLE ROW LEVEL SECURITY;

-- Policy für App-Zugriff
CREATE POLICY "Allow register transfers access via app" 
ON register_transfers FOR ALL USING (true);

-- Index für Performance
CREATE INDEX idx_register_transfers_restaurant 
ON register_transfers(restaurant_id, transfer_date DESC);
```

**Hook-Struktur:**
```typescript
interface RegisterTransfer {
  id: string;
  transfer_date: string;
  amount: number;
  direction: 'to_restaurant' | 'to_safe';
  reason: string | null;
  restaurant_id: string;
  created_at: string;
}

export function useRegisterTransfers(restaurantId: string | null) {
  // Lädt alle Transfers
  // Berechnet aktuelle Bestände:
  //   safeBalance = initialSafe - toRestaurant + toSafe
  //   restaurantBalance = initialRestaurant + toRestaurant - toSafe
  // CRUD-Operationen für Transfers
}
```

### Zusammenfassung

| Komponente | Beschreibung |
|------------|--------------|
| Neue DB-Tabelle | `register_transfers` für Transfer-Historie |
| Neue Seite | Übersicht beider Kassen mit aktuellem Bestand |
| Transfer-Dialog | Erfassen von Geld-Bewegungen zwischen Kassen |
| Transfer-Liste | Chronologische Übersicht aller Bewegungen |
| Navigation | Neuer Punkt "Wechselgeldbestand" für Manager |
