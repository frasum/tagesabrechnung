/**
 * SFN-Zuschlagsprozentsätze (Sonntag, Feiertag, Nacht).
 * Steuerfrei nach §3b EStG bis zur jeweiligen Grundlohngrenze.
 */
export const SFN_RATES = {
  /** Nachtzuschlag 25%: 20:00–00:00 und 04:00–06:00 */
  night25: 0.25,
  /** Nachtzuschlag 40%: 00:00–04:00 (Schicht muss vor Mitternacht beginnen) */
  night40: 0.40,
  /** Sonntagszuschlag: 50% des Grundlohns */
  sunday: 0.50,
  /** Feiertagszuschlag: 125% des Grundlohns */
  holiday: 1.25,
} as const;

/** Grundlohngrenze für steuerfreie SFN-Zuschläge (2026): 50 €/h */
export const SFN_TAX_FREE_HOURLY_LIMIT = 50;
