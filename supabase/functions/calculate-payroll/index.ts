const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── State abbreviation mapping ──
const STATE_ABBR: Record<string, string> = {
  "Baden-Württemberg": "bw", "Bayern": "by", "Berlin": "be", "Brandenburg": "bb",
  "Bremen": "hb", "Hamburg": "hh", "Hessen": "he", "Mecklenburg-Vorpommern": "mv",
  "Niedersachsen": "ni", "Nordrhein-Westfalen": "nw", "Rheinland-Pfalz": "rp",
  "Saarland": "sl", "Sachsen": "sn", "Sachsen-Anhalt": "st", "Schleswig-Holstein": "sh",
  "Thüringen": "th",
};

// ── SFN rates (local, not covered by API) ──
const SFN_RATES = { night: 0.25, sunday: 0.50, holiday: 1.25 };
const SFN_TAX_FREE_HOURLY_LIMIT = 50;

// ── Lohnica API call ──
async function callLohnicaApi(body: any, apiKey: string): Promise<any> {
  const now = new Date();
  const year = body.calculationYear || now.getFullYear();
  const month = body.calculationMonth || (now.getMonth() + 1);
  const period = `${year}-${String(month).padStart(2, "0")}`;

  const gross = body.grossMonthly;
  if (!gross || gross <= 0) throw new Error("Kein Brutto ermittelbar");

  const stateAbbr = STATE_ABBR[body.state] || "by";
  const taxClassStr = String(["I","II","III","IV","V","VI"].indexOf(body.taxClass) + 1 || 1);
  const childAllowance = body.childAllowances ?? 0;

  const apiPayload: Record<string, any> = {
    "monthly-gross-income": gross,
    "age": 30,
    "income-tax-class": taxClassStr,
    "child-allowance": String(childAllowance),
    "tax-exempt-amount-monthly": 0,
    "state": stateAbbr,
    "church-tax": body.churchTax === true,
    "pension-insurance": true,
    "unemployment-insurance": true,
    "has-children": childAllowance > 0,
    "children-below-25": childAllowance > 0 ? Math.ceil(childAllowance) : 0,
    "calculation-month": month,
    "calculation-year": year,
    "insurance-type": body.insuranceType === "privat" ? "private" : "compulsory",
    "health-insurance-company-number": "67450665", // TK as default
    "collecting-agency-company-number": "67450665",
    "private-health-insurance-premium": 0,
    "private-health-insurance-base-amount": 0,
    "employer-subsidy": false,
    "income-tax-factor": 1,
    "midi-job": false,
    "mini-job": false,
  };

  const apiUrl = Deno.env.get("BRUTTO_NETTO_API_URL") || "https://brutto-netto-api.de";
  const url = `${apiUrl}/api/v1/gross-net-calc/${period}`;

  const keyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "(empty)";
  console.log("Calling Lohnica API:", url, "key:", keyPreview);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(apiPayload),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API ${resp.status}: ${text}`);
  }

  const apiData = await resp.json();
  console.log("Lohnica API raw response:", JSON.stringify(apiData));

  // Check validation errors
  if (apiData?.data?.["validation-errors"]) {
    console.error("Lohnica validation errors:", JSON.stringify(apiData.data["validation-errors"]));
    throw new Error("API validation error");
  }

  return apiData;
}

function mapLohnicaResponse(apiResult: any, gross: number): any {
  const d = apiResult?.data ?? apiResult;
  const emp = d?.employee ?? {};
  const ag = d?.employer ?? {};

  const incomeTax = emp["income-tax"] ?? 0;
  const soli = emp["solidarity-tax"] ?? 0;
  const churchTax = emp["church-tax"] ?? 0;
  const anKV = emp["health-insurance"] ?? 0;
  const anRV = emp["pension-insurance"] ?? 0;
  const anAV = emp["unemployment-insurance"] ?? 0;
  const anPV = emp["nursing-care-insurance"] ?? 0;
  const netMonthly = d["net-salary"] ?? d["net-pay"] ?? (gross - incomeTax - soli - churchTax - anKV - anRV - anAV - anPV);

  const agKV = ag["health-insurance"] ?? 0;
  const agRV = ag["pension-insurance"] ?? 0;
  const agAV = ag["unemployment-insurance"] ?? 0;
  const agPV = ag["nursing-care-insurance"] ?? 0;
  const agU1 = ag["u1-contribution"] ?? 0;
  const agU2 = ag["u2-contribution"] ?? 0;
  const agInsolvenz = ag["insolvency-contribution"] ?? 0;
  const agUmlagenTotal = Math.round((agU1 + agU2 + agInsolvenz) * 100) / 100;
  const employerTotal = d["labor-cost"] ?? Math.round((gross + agKV + agRV + agAV + agPV + agUmlagenTotal) * 100) / 100;

  return {
    grossMonthly: gross,
    netMonthly,
    incomeTax,
    soli,
    churchTax,
    employee: { kv: anKV, rv: anRV, av: anAV, pv: anPV },
    employer: { kv: agKV, rv: agRV, av: agAV, pv: agPV },
    employerTotal,
    agUmlagen: { u1: agU1, u2: agU2, insolvenzumlage: agInsolvenz },
    source: "api" as const,
  };
}

// ═══════════════════════════════════════════════════════════
// FALLBACK: Internal calculation (kept from original)
// ═══════════════════════════════════════════════════════════

const CHURCH_TAX_9_STATES = ["Bayern", "Baden-Württemberg"];

function calcIncomeTax(annualGross: number, taxClass: string, childAllowances: number): number {
  let grundfreibetrag = 12_096;
  let sonderausgaben = 36;
  let werbungskosten = 1_230;
  let childFreibetrag = childAllowances * 4_800;

  switch (taxClass) {
    case "II": grundfreibetrag += 4_260; break;
    case "III": grundfreibetrag *= 2; break;
    case "V": grundfreibetrag = 0; childFreibetrag = 0; break;
    case "VI": grundfreibetrag = 0; sonderausgaben = 0; werbungskosten = 0; childFreibetrag = 0; break;
  }

  const taxableIncome = Math.max(0, annualGross - grundfreibetrag - sonderausgaben - werbungskosten - childFreibetrag);

  let tax = 0;
  if (taxableIncome <= 0) {
    tax = 0;
  } else if (taxableIncome <= 17_442) {
    const y = (taxableIncome - 1) / 10_000;
    tax = (932.30 * y + 1_400) * y;
  } else if (taxableIncome <= 68_480) {
    const z = (taxableIncome - 17_442) / 10_000;
    tax = (176.46 * z + 2_397) * z + 3_014;
  } else if (taxableIncome <= 277_826) {
    tax = 0.42 * taxableIncome - 10_636;
  } else {
    tax = 0.45 * taxableIncome - 18_971;
  }

  return Math.round((Math.max(0, Math.round(tax)) / 12) * 100) / 100;
}

function calcSoli(incomeTax: number): number {
  const monthlyFreigrenze = 1_340 / 12;
  if (incomeTax <= monthlyFreigrenze) return 0;
  const milderung = 1_780 / 12;
  if (incomeTax <= milderung) return Math.round((incomeTax - monthlyFreigrenze) * 0.119 * 100) / 100;
  return Math.round(incomeTax * 0.055 * 100) / 100;
}

function calcChurchTax(incomeTax: number, state: string): number {
  const rate = CHURCH_TAX_9_STATES.includes(state) ? 0.08 : 0.09;
  return Math.round(incomeTax * rate * 100) / 100;
}

interface SocialContributions { kv: number; rv: number; av: number; pv: number; }

function calcEmployeeContributions(gross: number, insuranceType: string, childAllowances: number): SocialContributions {
  const kvRate = insuranceType === "gesetzlich" ? 0.073 + 0.009 : 0;
  const rvRate = 0.093;
  const avRate = 0.013;
  let pvRate = 0.017;
  if (childAllowances === 0) pvRate += 0.006;
  if (childAllowances >= 2) pvRate -= Math.min(childAllowances - 1, 4) * 0.0025;
  pvRate = Math.max(pvRate, 0);
  const bbgKv = 5_512.50, bbgRv = 8_050;
  const kvB = Math.min(gross, bbgKv), rvB = Math.min(gross, bbgRv);
  return {
    kv: Math.round(kvB * kvRate * 100) / 100,
    rv: Math.round(rvB * rvRate * 100) / 100,
    av: Math.round(rvB * avRate * 100) / 100,
    pv: Math.round(kvB * pvRate * 100) / 100,
  };
}

function calcEmployerContributions(gross: number, insuranceType: string): SocialContributions {
  const kvRate = insuranceType === "gesetzlich" ? 0.073 + 0.0045 : 0;
  const rvRate = 0.093, avRate = 0.013, pvRate = 0.017;
  const bbgKv = 5_512.50, bbgRv = 8_050;
  const kvB = Math.min(gross, bbgKv), rvB = Math.min(gross, bbgRv);
  return {
    kv: Math.round(kvB * kvRate * 100) / 100,
    rv: Math.round(rvB * rvRate * 100) / 100,
    av: Math.round(rvB * avRate * 100) / 100,
    pv: Math.round(kvB * pvRate * 100) / 100,
  };
}

function fallbackCalculation(body: any): any {
  let gross: number;
  if (body.grossMonthly && body.grossMonthly > 0) {
    gross = body.grossMonthly;
  } else if (body.hourlyRate && body.monthlyHours) {
    gross = body.hourlyRate * body.monthlyHours;
  } else {
    throw new Error("Bruttogehalt oder Stundenlohn + Monatsstunden erforderlich.");
  }
  gross = Math.round(gross * 100) / 100;

  const annualGross = gross * 12;
  const incomeTax = calcIncomeTax(annualGross, body.taxClass || "I", body.childAllowances || 0);
  const soli = calcSoli(incomeTax);
  const churchTaxAmount = body.churchTax ? calcChurchTax(incomeTax, body.state || "Bayern") : 0;

  const employee = calcEmployeeContributions(gross, body.insuranceType || "gesetzlich", body.childAllowances || 0);
  const employer = calcEmployerContributions(gross, body.insuranceType || "gesetzlich");

  const totalDeductions = incomeTax + soli + churchTaxAmount + employee.kv + employee.rv + employee.av + employee.pv;
  const netMonthly = Math.round((gross - totalDeductions) * 100) / 100;
  const employerTotal = Math.round((gross + employer.kv + employer.rv + employer.av + employer.pv) * 100) / 100;

  return {
    grossMonthly: gross,
    netMonthly,
    incomeTax,
    soli,
    churchTax: churchTaxAmount,
    employee,
    employer,
    employerTotal,
    source: "fallback" as const,
  };
}

// ═══════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const sfnHours = body.sfnHours || { night: 0, sunday: 0, holiday: 0 };
    const sfnHourlyRate = body.sfnHourlyRate || 0;

    // Determine gross for SFN & effective rate calculation
    let gross: number;
    if (body.grossMonthly && body.grossMonthly > 0) {
      gross = body.grossMonthly;
    } else if (body.hourlyRate && body.monthlyHours) {
      gross = body.hourlyRate * body.monthlyHours;
    } else {
      return new Response(
        JSON.stringify({ error: "Bruttogehalt oder Stundenlohn + Monatsstunden erforderlich." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    gross = Math.round(gross * 100) / 100;

    // ── Try Lohnica API first ──
    let coreResult: any;
    const apiKey = Deno.env.get("BRUTTO_NETTO_API_KEY");

    if (apiKey) {
      try {
        const apiResponse = await callLohnicaApi({ ...body, grossMonthly: gross }, apiKey);
        coreResult = mapLohnicaResponse(apiResponse, gross);
      } catch (apiErr) {
        console.error("Lohnica API error, using fallback:", apiErr);
        coreResult = fallbackCalculation({ ...body, grossMonthly: gross });
      }
    } else {
      console.warn("No BRUTTO_NETTO_API_KEY configured, using fallback");
      coreResult = fallbackCalculation({ ...body, grossMonthly: gross });
    }

    // ── Compute employerTotal if from API (add employer contributions) ──
    if (!coreResult.employerTotal) {
      const emp = coreResult.employer;
      coreResult.employerTotal = Math.round((gross + emp.kv + emp.rv + emp.av + emp.pv) * 100) / 100;
    }

    // ── SFN bonuses (always local) ──
    const effectiveSfnRate = Math.min(sfnHourlyRate, SFN_TAX_FREE_HOURLY_LIMIT);
    const nightBonus = Math.round(sfnHours.night * effectiveSfnRate * SFN_RATES.night * 100) / 100;
    const sundayBonus = Math.round(sfnHours.sunday * effectiveSfnRate * SFN_RATES.sunday * 100) / 100;
    const holidayBonus = Math.round(sfnHours.holiday * effectiveSfnRate * SFN_RATES.holiday * 100) / 100;
    const totalBonus = Math.round((nightBonus + sundayBonus + holidayBonus) * 100) / 100;

    // ── Effective net hourly rate ──
    const totalHours = body.monthlyHours || (body.hourlyRate ? gross / body.hourlyRate : 0);
    const effectiveNetHourlyRate = totalHours > 0
      ? Math.round(((coreResult.netMonthly + totalBonus) / totalHours) * 100) / 100
      : 0;

    const result = {
      ...coreResult,
      sfn: { nightBonus, sundayBonus, holidayBonus, totalBonus },
      effectiveNetHourlyRate,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || "Interner Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
