/**
 * Bewusste Kopie des COCO-Modells (tip-pool.ts, Stand 19.07.2026) für
 * Anzeige-Parität bis zur Archivierung dieses Systems am 26.07.2026.
 * Bei Abweichungen gilt COCO.
 *
 * Verteilt einen Trinkgeld-Topf STUNDENBASIERT auf N Teilnehmer und
 * rundet jeden Anteil auf VOLLE EURO AB. Der Verteilungsrest (Cents)
 * fließt in der Anzeige der Tagesabrechnung ins Tages-Bargeld.
 *
 * Rechnung ausschließlich in Cents (Integer). Personen mit 0/fehlenden
 * Stunden erhalten 0 €. Sind ALLE Stunden 0, ist der komplette Pool
 * der Rest.
 *
 *   anteil(p) = floor( poolCents × stunden(p) / Σstunden / 100 ) × 100
 *   rest      = poolCents − Σ anteile
 */

export interface TipParticipant {
  key: string;
  hours: number;
}

export interface TipDistribution {
  sharesCents: Map<string, number>;
  restCents: number;
}

/** Konvertiert Euro-Wert sicher in ganze Cents. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/** COCO-Trinkgeldverteilung nach Stunden, Anteile auf volle Euro abgerundet. */
export function distributeByHoursCocoModel(
  poolCents: number,
  participants: TipParticipant[],
): TipDistribution {
  const sharesCents = new Map<string, number>();
  const pool = Math.max(0, Math.round(poolCents));

  // Aggregate hours per key (defensive – gleiche Person kann mehrfach vorkommen)
  const hoursByKey = new Map<string, number>();
  for (const p of participants) {
    const h = Number.isFinite(p.hours) ? Math.max(0, p.hours) : 0;
    hoursByKey.set(p.key, (hoursByKey.get(p.key) ?? 0) + h);
  }

  const totalHours = Array.from(hoursByKey.values()).reduce((s, h) => s + h, 0);

  if (pool <= 0 || totalHours <= 0) {
    for (const key of hoursByKey.keys()) sharesCents.set(key, 0);
    return { sharesCents, restCents: pool };
  }

  let distributed = 0;
  for (const [key, hours] of hoursByKey) {
    // floor auf ganze Euro (100 Cent) exakt nach COCO
    const raw = (pool * hours) / totalHours;
    const cents = Math.floor(raw / 100) * 100;
    sharesCents.set(key, cents);
    distributed += cents;
  }

  return { sharesCents, restCents: pool - distributed };
}
