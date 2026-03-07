

# Provision: Toggle, Buchhaltungs-Spalte (bedingt), Lohnbüro & Exporte

## Kernänderung gegenüber vorherigem Plan
Die Provisions-Spalte in der Buchhaltung (und Lohnbüro + Exporte) wird **nur angezeigt, wenn der Toggle aktiv ist**. Ist `commission_add_to_gross = false` (Standard), erscheint keine Spalte.

## Umsetzung

### 1. Neuer Hook: `src/hooks/useCommissionData.ts`
- Extrahiert die Provisionsberechnung aus `ZtProvision.tsx` (Tages-Schwellenwert, Pool, Stunden-Verteilung)
- Input: `restaurantId`, `startDate`, `endDate`
- Output: `commissionMap: Map<staffId, number>`, `totalCommission`, `isLoading`
- Lädt Settings (`commission_min_revenue`, `commission_pct`), `waiter_shifts`, `zt_shifts`, Staff-Rollen

### 2. Neuer Setting-Hook: `src/hooks/useSettings.ts`
- Neue Funktion `useCommissionAddToGross(restaurantId)` — liest/schreibt `commission_add_to_gross` aus `settings`-Tabelle
- Gleiche Logik wie bestehende Settings-Hooks (z.B. `useShowTipRanking`)

### 3. `ZtProvision.tsx` — Toggle hinzufügen
- Switch "Provision zum Brutto addieren" neben Mindest-Ø und Provisionssatz
- Nutzt `useCommissionAddToGross` zum Speichern

### 4. `ZtBruttoNetto.tsx` — Provision zum Brutto
- Wenn `commission_add_to_gross` aktiv: `useCommissionData` für den gewählten Mitarbeiter nutzen
- Provision zum `grossMonthly` addieren, Badge "inkl. X € Provision" anzeigen

### 5. Buchhaltung — Bedingte Spalte "Prov."
Alle Komponenten erhalten ein neues Prop `showCommission: boolean`:
- **`ZtBuchhaltung.tsx`**: `useCommissionAddToGross` + `useCommissionData` laden, `showCommission` und `commissionMap` durchreichen
- **`BuchhaltungTableHead.tsx`**: Spalte "Prov." nur wenn `showCommission`
- **`BuchhaltungRow.tsx`**: Neues Prop `commission?: number`, Zelle nur wenn `showCommission`
- **`BuchhaltungFooter.tsx`**: Summe nur wenn `showCommission`
- **`BuchhaltungDeptHeader.tsx`**: `colSpan` +1 wenn `showCommission`

### 6. Lohnbüro — `PayrollPortal.tsx`
- Gleiche Logik: `useCommissionAddToGross` + `useCommissionData` laden
- `showCommission` und `commissionMap` an Buchhaltungs-Komponenten durchreichen

### 7. Exporte — Bedingte Spalte
- **`exportBuchhaltungPdf.ts`**, **`exportBuchhaltungExcel.ts`**, **`exportCsv.ts`**: Neuer optionaler Parameter `commissionMap?: Map<string, number>`
- Spalte "Provision" wird nur eingefügt wenn `commissionMap` übergeben wird

## Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/useCommissionData.ts` | **Neu** |
| `src/hooks/useSettings.ts` | `useCommissionAddToGross` hinzufügen |
| `src/pages/zeiterfassung/ZtProvision.tsx` | Toggle |
| `src/pages/zeiterfassung/ZtBruttoNetto.tsx` | Provision zum Brutto |
| `src/pages/zeiterfassung/ZtBuchhaltung.tsx` | Hook + bedingte Weitergabe |
| `src/pages/zeiterfassung/buchhaltung/BuchhaltungTableHead.tsx` | Bedingte Spalte |
| `src/pages/zeiterfassung/buchhaltung/BuchhaltungRow.tsx` | Bedingte Zelle |
| `src/pages/zeiterfassung/buchhaltung/BuchhaltungFooter.tsx` | Bedingte Summe |
| `src/pages/zeiterfassung/buchhaltung/BuchhaltungDeptHeader.tsx` | Bedingtes colSpan |
| `src/pages/shared/PayrollPortal.tsx` | Hook + bedingte Weitergabe |
| `src/lib/exportBuchhaltungPdf.ts` | Optionale Spalte |
| `src/lib/exportBuchhaltungExcel.ts` | Optionale Spalte |
| `src/lib/exportCsv.ts` | Optionale Spalte |

