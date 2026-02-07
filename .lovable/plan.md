
# Plan: Entfernen von Gustoco, Orderhut und UberEats

## Überblick
Die Plattformen Gustoco, Orderhut und UberEats müssen komplett aus dem Code entfernt werden, da sie nicht mehr aktiv verwendet werden. Es bleiben nur OrderSmart, Wolt und Take-Away GL als Lieferplattformen.

## Betroffene Dateien

### 1. **Datenbankschema** (Datei: `supabase/migrations/20260206200549_823c6dd4-ad20-41d5-aaaa-3a0386ad30b9.sql`)
- Entfernen Sie die Spalten `gustoco_revenue`, `orderhut_revenue`, und `ubereats_revenue` aus der `sessions` Tabelle
- Dies ist eine **Datenbankänderung**, die über die Migration durchgeführt werden muss

### 2. **TypeScript Typen** (Dateien: `src/types/database.ts` und `src/integrations/supabase/types.ts`)
- Entfernen Sie die Felder `gustoco_revenue`, `orderhut_revenue`, `ubereats_revenue` aus dem `Session` Interface in `src/types/database.ts`
- Die `src/integrations/supabase/types.ts` wird automatisch von Supabase generiert, daher wird sie sich selbst nach der Datenbankänderung aktualisieren

### 3. **ManagerDashboard.tsx** (Datei: `src/pages/ManagerDashboard.tsx`)
- **Form State** (Zeilen 33-54): Entfernen Sie `gustoco_revenue`, `orderhut_revenue`, `ubereats_revenue` aus dem `formData` State
- **Session Sync** (Zeilen 70-93 und 94-112): Entfernen Sie diese Felder aus beiden UseEffect Branches
- **Formel** (Zeilen 227-233): Aktualisieren Sie `totalDeliveryRevenue` Berechnung auf nur OrderSmart, Wolt und takeaway_total
- **UI Section** (Zeilen 380-420): Entfernen Sie die Input-Felder für Gustoco, Orderhut und UberEats aus der "Lieferplattformen" Card

### 4. **DailySummary.tsx** (Datei: `src/pages/DailySummary.tsx`)
- **Formel** (Zeilen 53-60): Aktualisieren Sie `totalDeliveryRevenue` auf nur OrderSmart, Wolt und takeaway_total
- **UI Table** (Zeilen 349-372): Entfernen Sie die TableRows für Gustoco (Zeile 353-356), Orderhut (Zeile 357-360) und UberEats (Zeile 365-368)

### 5. **useStatistics.ts** (Datei: `src/hooks/useStatistics.ts`)
- **Berechnung** (Zeilen 140-145): Aktualisieren Sie `deliveryRevenue` Berechnung
- **Delivery Breakdown** (Zeilen 184-189): Entfernen Sie die Einträge für Gustoco, Orderhut und UberEats

### 6. **useStatisticsComparison.ts** (Datei: `src/hooks/useStatisticsComparison.ts`)
- **Berechnung** (Zeilen 77-79): Aktualisieren Sie `totalDelivery` Berechnung auf nur die drei aktiven Plattformen

### 7. **pdfExport.ts** (Datei: `src/utils/pdfExport.ts`)
- **Session Interface** (Zeilen 6-27): Entfernen Sie `gustoco_revenue`, `orderhut_revenue`, `ubereats_revenue`
- **PDF Body** (Zeilen 310-318): Entfernen Sie die Zeilen für Gustoco, Orderhut und UberEats aus der Delivery Platforms Tabelle

## Neue Formel nach der Änderung

Die neue **totalDeliveryRevenue** Formel wird überall einheitlich sein:
```typescript
const totalDeliveryRevenue = 
  formData.ordersmart_revenue +
  formData.wolt_revenue +
  formData.takeaway_total;
```

## Implementierungsreihenfolge

1. **Zuerst**: Datenbankänderung durchführen (Spalten entfernen)
2. **Dann**: TypeScript-Typen aktualisieren (`src/types/database.ts`)
3. **Dann**: Code in allen React-Komponenten und Hooks aktualisieren (ManagerDashboard, DailySummary, useStatistics, useStatisticsComparison, pdfExport)
4. **Dann**: Alle Komponenten testen und sicherstellen, dass die Formeln korrekt funktionieren

## Auswirkungen

- Die Lieferplattformen-Section im Manager Dashboard wird kleiner und übersichtlicher
- Die DailySummary Anzeige für Lieferplattformen wird vereinfacht
- Alle Berechnungen bleiben mathematisch korrekt
- Bestehende Daten mit Werten für die drei entfernten Plattformen können nicht mehr angezeigt werden (müssen vor der Migration auf 0 gesetzt sein, falls wichtig)

