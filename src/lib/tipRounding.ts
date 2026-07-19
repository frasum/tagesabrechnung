/**
 * Tip display rounding helpers (tagesabrechnung).
 *
 * Physisch werden Trinkgelder nur in vollen Euro ausgezahlt; die Cent-Reste
 * bleiben in der Lade und werden anschließend still ins angezeigte
 * Tages-Bargeld eingerechnet. Diese Helper decken NUR die Anzeige ab –
 * die Verteilungs-/Pool-Logik bleibt unverändert, gespeicherte Werte und
 * alle Export-Pfade (PDF/Excel/History) behalten ihre Legacy-Semantik.
 *
 * Rechnung erfolgt in Cents, um Float-Artefakte zu vermeiden.
 */

/** Rundet einen Euro-Betrag auf volle Euro AB. Beispiel: 56,61 → 56,00. */
export function floorToEuroCents(amountEuros: number): number {
  const cents = Math.round(amountEuros * 100);
  return (Math.floor(cents / 100) * 100) / 100;
}

/**
 * Abrundungs-Rest eines Trinkgeld-Topfes, der gleichmäßig auf N Anteile verteilt wird.
 *   rest = pool − floor(pool/anteile auf ganze Euro) * anteile
 *
 * Beispiele:
 *   pool=100,00 €, shares=3 → perShare=33,33 → floored=33,00 → rest=1,00 €
 *   pool=126,16 €, shares=4 → perShare=31,54 → floored=31,00 → rest=2,16 €
 */
export function computeTipRestEuros(poolEuros: number, shareCount: number): number {
  if (shareCount <= 0) return 0;
  const poolCents = Math.round(poolEuros * 100);
  const perShareFlooredCents = Math.floor(poolCents / shareCount / 100) * 100;
  const restCents = poolCents - perShareFlooredCents * shareCount;
  return restCents / 100;
}
