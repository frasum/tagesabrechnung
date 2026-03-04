export interface PayrollInput {
  grossMonthly: number | null;
  hourlyRate: number | null;
  monthlyHours: number | null;
  taxClass: string;
  state: string;
  churchTax: boolean;
  insuranceType: 'gesetzlich' | 'privat';
  childAllowances: number;
  sfnHours: {
    night: number;
    sunday: number;
    holiday: number;
  };
  sfnHourlyRate: number;
  /** Year for Lohnica API calculation */
  calculationYear?: number;
  /** Month (1-12) for Lohnica API calculation */
  calculationMonth?: number;
}

export interface AgUmlagen {
  u1: number;
  u2: number;
  insolvenzumlage: number;
}

export interface PayrollResult {
  grossMonthly: number;
  netMonthly: number;
  incomeTax: number;
  soli: number;
  churchTax: number;
  employee: { kv: number; rv: number; av: number; pv: number };
  employer: { kv: number; rv: number; av: number; pv: number };
  employerTotal: number;
  sfn: {
    nightBonus: number;
    sundayBonus: number;
    holidayBonus: number;
    totalBonus: number;
  };
  effectiveNetHourlyRate: number;
  /** Where the calculation came from */
  source?: 'api' | 'fallback';
  /** Employer levies from Lohnica API */
  agUmlagen?: AgUmlagen;
}

export const GERMAN_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
] as const;

export const TAX_CLASSES = ["I", "II", "III", "IV", "V", "VI"] as const;

/** States where church tax is 9% (all others 8%) */
export const CHURCH_TAX_9_STATES = ["Bayern", "Baden-Württemberg"] as const;

/** Mapping German state names to Lohnica API abbreviations */
export const STATE_ABBREVIATIONS: Record<string, string> = {
  "Baden-Württemberg": "bw",
  "Bayern": "by",
  "Berlin": "be",
  "Brandenburg": "bb",
  "Bremen": "hb",
  "Hamburg": "hh",
  "Hessen": "he",
  "Mecklenburg-Vorpommern": "mv",
  "Niedersachsen": "ni",
  "Nordrhein-Westfalen": "nw",
  "Rheinland-Pfalz": "rp",
  "Saarland": "sl",
  "Sachsen": "sn",
  "Sachsen-Anhalt": "st",
  "Schleswig-Holstein": "sh",
  "Thüringen": "th",
};
