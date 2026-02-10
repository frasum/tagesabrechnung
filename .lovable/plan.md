
# Technische und Performance-Verbesserungen

## 1. Code-Splitting mit React.lazy (Ladezeit)

**Problem:** Alle 15+ Seiten werden beim ersten App-Start geladen, auch wenn der Nutzer nur eine Seite braucht.

**Loesung:** Seiten-Imports in `App.tsx` auf `React.lazy()` umstellen und mit `<Suspense>` wrappen. Dadurch wird jede Seite erst geladen, wenn sie tatsaechlich besucht wird.

**Auswirkung:** Deutlich schnellere initiale Ladezeit, besonders auf mobilen Geraeten.

---

## 2. Globale staleTime fuer React Query

**Problem:** Bei jedem Seitenwechsel werden Daten neu vom Server geholt, obwohl sie sich meist nicht geaendert haben. Nur 3 von ~15 Hooks haben eine `staleTime`.

**Loesung:** Im `QueryClient` in `App.tsx` eine globale `staleTime` von 2 Minuten setzen. Dadurch werden Daten nach dem ersten Laden 2 Minuten lang aus dem Cache bedient.

**Auswirkung:** Weniger Netzwerk-Anfragen, schnellere Navigation zwischen Seiten.

---

## 3. Selektive Spaltenabfragen

**Problem:** Fast alle Datenbank-Abfragen nutzen `select('*')` und laden alle Spalten, obwohl oft nur wenige benoetigt werden.

**Loesung:** In den wichtigsten Hooks (z.B. `useCashBalanceData`, `useWaiterRanking`) nur die tatsaechlich benoetigten Spalten abfragen.

**Auswirkung:** Weniger Datentransfer, schnellere Antwortzeiten.

---

## 4. Datumsbegrenzung fuer grosse Abfragen

**Problem:** `useCashBalanceData` laedt ALLE Sessions eines Restaurants ohne Zeitlimit. Bei wachsenden Daten stoeßt das an das 1000-Zeilen-Limit und wird langsamer.

**Loesung:** Einen Datumsfilter einfuehren (z.B. nur den aktuellen Monat oder die letzten 90 Tage laden). Fuer aeltere Daten eine optionale "Mehr laden"-Funktion.

**Auswirkung:** Konstante Performance auch bei wachsender Datenmenge.

---

## 5. Sicherheit: RLS-Policies verschaerfen

**Problem:** Der Datenbank-Linter meldet 8+ Warnungen fuer RLS-Policies mit `USING (true)` -- das bedeutet, technisch gesehen kann jeder mit dem API-Key alle Daten lesen und schreiben.

**Loesung:** Die betroffenen Tabellen identifizieren und die Policies so anpassen, dass nur authentifizierte Nutzer mit gueltigem `staff_id`-Bezug Zugriff erhalten.

**Hinweis:** Da die App PIN-basierte Authentifizierung nutzt (ohne Supabase Auth fuer alle Nutzer), muss hier sorgfaeltig abgewaegt werden, welche Einschraenkungen moeglich sind, ohne die Funktionalitaet zu brechen.

---

## Technische Details

### Datei-Aenderungen

**`src/App.tsx`:**
- Alle Seiten-Imports auf `React.lazy(() => import(...))` umstellen
- `<Suspense fallback={<Loading />}>` um die Routes wrappen
- `QueryClient` mit `defaultOptions: { queries: { staleTime: 2 * 60 * 1000 } }` konfigurieren

**`src/hooks/useCashBalanceData.ts`:**
- `select('*')` durch spezifische Spalten ersetzen
- Datumsfilter hinzufuegen (aktueller Monat als Standard)

**`src/hooks/useWaiterRanking.ts`:**
- `select('*')` durch spezifische Spalten ersetzen
- Zeitraum begrenzen

**Weitere Hooks** (useSession, useStatistics, etc.):
- `select('*')` durch benoetigte Spalten ersetzen

### Reihenfolge
1. Code-Splitting + staleTime (groesster Effekt, geringster Aufwand)
2. Selektive Spalten in den Haupt-Hooks
3. Datumsbegrenzung fuer Cash Balance
4. RLS-Policies (erfordert sorgfaeltige Analyse)
