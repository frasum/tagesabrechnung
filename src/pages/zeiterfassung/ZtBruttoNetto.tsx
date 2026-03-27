import { useState, useMemo, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRestaurantEmployees } from "@/hooks/useRestaurantEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, Info, AlertTriangle, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { SFN_RATES } from "@/lib/sfnRates";
import { GERMAN_STATES, TAX_CLASSES, type PayrollResult } from "@/types/payroll";
import { useZt } from "@/contexts/ZtContext";
import type { SfnMode } from "@/hooks/useSfnMode";
import BatchPayrollCalculation from "@/components/zeiterfassung/BatchPayrollCalculation";

const CHILD_ALLOWANCE_OPTIONS = Array.from({ length: 17 }, (_, i) => i * 0.5);

export default function ZtBruttoNetto() {
  const { restaurantId } = useRestaurant();
  const { data: employees = [] } = useRestaurantEmployees(restaurantId);
  const { selectedPeriodId, periods } = useZt();
  const { sfnMode } = useOutletContext<{ sfnMode: SfnMode }>();
  const isExtended = sfnMode === "extended";

  // Form state
  const [employeeId, setEmployeeId] = useState<string>("");
  const [grossMonthly, setGrossMonthly] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [monthlyHours, setMonthlyHours] = useState<string>("");
  const [taxClass, setTaxClass] = useState<string>("I");
  const [state, setState] = useState<string>("Bayern");
  const [churchTax, setChurchTax] = useState(false);
  const [isSvExempt, setIsSvExempt] = useState(false);
  const [insuranceType, setInsuranceType] = useState<"gesetzlich" | "privat">("gesetzlich");
  const [childAllowances, setChildAllowances] = useState<number>(0);
  const [localPeriodId, setLocalPeriodId] = useState<string>("");

  // Init local period from global selection
  useEffect(() => {
    if (selectedPeriodId && !localPeriodId) {
      setLocalPeriodId(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  // Derive dates from selected period
  const selectedLocalPeriod = periods?.find(p => p.id === localPeriodId);
  const dateFrom = selectedLocalPeriod?.start_date ?? "";
  const dateTo = selectedLocalPeriod?.end_date ?? "";

  const [result, setResult] = useState<PayrollResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from employee
  const selectedEmployee = employees.find(e => e.id === employeeId);

  // Load staff details for auto-fill
  const { data: staffDetails } = useQuery({
    queryKey: ["staff-details-payroll", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("hourly_rate, tax_class, health_insurance, is_minijob, is_sv_exempt")
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Load zt_hourly_rate from staff_restaurants
  const { data: staffRestaurant } = useQuery({
    queryKey: ["staff-restaurant-payroll", employeeId, restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_restaurants")
        .select("zt_hourly_rate")
        .eq("staff_id", employeeId)
        .eq("restaurant_id", restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && !!restaurantId,
  });

  // Auto-fill when employee changes
  const effectiveHourlyRate = (staffRestaurant?.zt_hourly_rate || 0) > 0 ? staffRestaurant!.zt_hourly_rate : (staffDetails?.hourly_rate ?? 0);

  // When employee selected, auto-fill fields
  useEffect(() => {
    if (staffDetails) {
      if (staffDetails.tax_class) setTaxClass(staffDetails.tax_class);
      if (effectiveHourlyRate) setHourlyRate(String(effectiveHourlyRate));
      if (staffDetails.health_insurance) {
        setInsuranceType(staffDetails.health_insurance === "privat" ? "privat" : "gesetzlich");
      }
      setIsSvExempt(staffDetails.is_sv_exempt === true);
    }
  }, [staffDetails, effectiveHourlyRate]);

  // Explicit return type for the SFN shift query
  interface SfnShiftRow {
    total_hours: number;
    night_hours: number;
    night_deep_hours: number;
    sunday_holiday_hours: number;
    is_holiday: boolean;
    evening_hours: number;
    shift_date: string;
  }

  interface SfnAggResult {
    totalHours: number;
    night25Hours: number;
    night40Hours: number;
    sundayHours: number;
    holidayHours: number;
    holiday150Hours: number;
    eveningHours: number;
    shiftCount: number;
  }

  // Fetch bavarian holidays for the period (needed for extended mode)
  const { data: holidays } = useQuery({
    queryKey: ["bavarian-holidays-payroll", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bavarian_holidays")
        .select("holiday_date, surcharge_rate")
        .gte("holiday_date", dateFrom)
        .lte("holiday_date", dateTo);
      if (error) throw error;
      return new Map(data.map(h => [h.holiday_date, h.surcharge_rate]));
    },
    enabled: !!dateFrom && !!dateTo,
  });

  function aggregateSimple(data: SfnShiftRow[]): SfnAggResult {
    const agg = { total: 0, night: 0, nightDeep: 0, sunday: 0, evening: 0, sundayEvening: 0, sundayNightDeep: 0 };
    for (const s of data) {
      agg.total += s.total_hours || 0;
      agg.night += s.night_hours || 0;
      agg.nightDeep += s.night_deep_hours || 0;
      agg.evening += s.evening_hours || 0;
      const isSundayOrHoliday = (s.sunday_holiday_hours || 0) > 0;
      if (isSundayOrHoliday) {
        agg.sundayEvening += s.evening_hours || 0;
        agg.sundayNightDeep += s.night_deep_hours || 0;
      }
      agg.sunday += s.sunday_holiday_hours || 0;
    }
    const rawNight25 = (agg.evening - agg.sundayEvening) + Math.max(0, (agg.night - agg.nightDeep));
    const rawNight40 = agg.nightDeep - agg.sundayNightDeep;
    return {
      totalHours: Math.round(agg.total * 100) / 100,
      night25Hours: Math.round(Math.max(0, rawNight25) * 100) / 100,
      night40Hours: Math.round(Math.max(0, rawNight40) * 100) / 100,
      sundayHours: Math.round(agg.sunday * 100) / 100,
      holidayHours: 0,
      holiday150Hours: 0,
      eveningHours: Math.round(agg.evening * 100) / 100,
      shiftCount: data.length,
    };
  }

  function aggregateExtended(data: SfnShiftRow[], hols: Map<string, number>): SfnAggResult {
    const agg = { total: 0, night: 0, nightDeep: 0, evening: 0, sunday: 0, holiday: 0, holiday150: 0 };
    for (const s of data) {
      agg.total += s.total_hours || 0;
      agg.night += s.night_hours || 0;
      agg.nightDeep += s.night_deep_hours || 0;
      agg.evening += s.evening_hours || 0;
      const soFeiHours = s.sunday_holiday_hours || 0;
      if (soFeiHours > 0) {
        if (s.is_holiday && hols) {
          const rate = hols.get(s.shift_date) ?? 1.25;
          if (rate >= 1.50) {
            agg.holiday150 += soFeiHours;
          } else {
            agg.holiday += soFeiHours;
          }
        } else {
          agg.sunday += soFeiHours;
        }
      }
    }
    const night25 = agg.evening + Math.max(0, agg.night - agg.nightDeep);
    const night40 = agg.nightDeep;
    return {
      totalHours: Math.round(agg.total * 100) / 100,
      night25Hours: Math.round(Math.max(0, night25) * 100) / 100,
      night40Hours: Math.round(Math.max(0, night40) * 100) / 100,
      sundayHours: Math.round(agg.sunday * 100) / 100,
      holidayHours: Math.round(agg.holiday * 100) / 100,
      holiday150Hours: Math.round(agg.holiday150 * 100) / 100,
      eveningHours: Math.round(agg.evening * 100) / 100,
      shiftCount: data.length,
    };
  }

  // Fetch SFN shift data — compute BOTH modes for comparison
  const { data: sfnBoth } = useQuery({
    queryKey: ["sfn-shifts-both", employeeId, dateFrom, dateTo, holidays ? "h" : ""],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zt_shifts")
        .select("total_hours, night_hours, night_deep_hours, sunday_holiday_hours, is_holiday, evening_hours, shift_date")
        .eq("employee_id", employeeId)
        .gte("shift_date", dateFrom)
        .lte("shift_date", dateTo)
        .is("absence_type", null)
        .returns<SfnShiftRow[]>();
      if (error) throw error;

      const simple = aggregateSimple(data);
      const extended = aggregateExtended(data, holidays ?? new Map());
      return { simple, extended };
    },
    enabled: !!employeeId && !!dateFrom && !!dateTo && holidays !== undefined,
  });

  const sfnData = sfnBoth ? (isExtended ? sfnBoth.extended : sfnBoth.simple) : undefined;
  const sfnOther = sfnBoth ? (isExtended ? sfnBoth.simple : sfnBoth.extended) : undefined;

  const hasSfnData = sfnData && sfnData.shiftCount > 0;

  // Auto-fill monthly hours from SFN data
  useEffect(() => {
    if (sfnData && sfnData.totalHours > 0) {
      setMonthlyHours(String(sfnData.totalHours));
    }
  }, [sfnData]);

  // Auto-recalculate when sfnMode changes
  const pendingRecalcRef = useRef(false);
  const prevSfnModeRef = useRef(sfnMode);
  useEffect(() => {
    if (sfnMode !== prevSfnModeRef.current) {
      prevSfnModeRef.current = sfnMode;
      if (result) {
        pendingRecalcRef.current = true;
        setResult(null);
        setError(null);
      }
    }
  }, [sfnMode, result]);

  useEffect(() => {
    if (pendingRecalcRef.current && sfnData && !calculating) {
      pendingRecalcRef.current = false;
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfnData, calculating]);

  // Derive calculation year/month from dateTo (end_date falls in the correct payroll month)
  const calculationYear = dateTo ? new Date(dateTo).getFullYear() : undefined;
  const calculationMonth = dateTo ? new Date(dateTo).getMonth() + 1 : undefined;

  async function handleCalculate() {
    setError(null);
    setResult(null);

    const gross = grossMonthly ? parseFloat(grossMonthly) : null;
    const hr = hourlyRate ? parseFloat(hourlyRate) : null;
    const mh = monthlyHours ? parseFloat(monthlyHours) : null;

    if (!gross && !(hr && mh)) {
      setError("Bitte Bruttogehalt oder Stundenlohn + Monatsstunden angeben.");
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        grossMonthly: gross,
        hourlyRate: hr,
        monthlyHours: mh,
        taxClass,
        state,
        churchTax,
        insuranceType,
        childAllowances,
        isSvExempt,
        sfnHours: {
          night25: sfnData?.night25Hours ?? 0,
          night40: sfnData?.night40Hours ?? 0,
          sunday: sfnData?.sundayHours ?? 0,
          holiday: sfnData?.holidayHours ?? 0,
          holiday150: sfnData?.holiday150Hours ?? 0,
        },
        sfnHourlyRate: hr ?? (gross && mh ? gross / mh : 0),
        calculationYear,
        calculationMonth,
      };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-payroll", {
        body: payload,
      });

      if (fnError) throw fnError;
      setResult(data as PayrollResult);
    } catch (e: any) {
      setError(e.message || "Berechnungsfehler");
    } finally {
      setCalculating(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  /** Compute total SFN bonus from aggregated hours and hourly rate */
  function computeSfnBonus(agg: SfnAggResult | undefined, rate: number): number {
    if (!agg) return 0;
    return (
      agg.night25Hours * rate * SFN_RATES.night25 +
      agg.night40Hours * rate * SFN_RATES.night40 +
      agg.sundayHours * rate * SFN_RATES.sunday +
      agg.holidayHours * rate * SFN_RATES.holiday +
      agg.holiday150Hours * rate * SFN_RATES.holiday150
    );
  }

  const sfnHourlyRate = hourlyRate ? parseFloat(hourlyRate) : (grossMonthly && monthlyHours ? parseFloat(grossMonthly) / parseFloat(monthlyHours) : 0);
  const currentBonus = computeSfnBonus(sfnData, sfnHourlyRate);
  const otherBonus = computeSfnBonus(sfnOther, sfnHourlyRate);
  const sfnDelta = otherBonus - currentBonus;
  const otherModeName = isExtended ? "Einfacher Modus" : "§3b-Modus";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brutto-Netto-Rechner</h1>

      {/* Batch-Berechnung für alle Restaurants */}
      <BatchPayrollCalculation
        dateFrom={dateFrom}
        dateTo={dateTo}
        sfnMode={sfnMode}
        holidays={holidays}
        calculationYear={calculationYear}
        calculationMonth={calculationMonth}
        onSelectEmployee={(staffId) => setEmployeeId(staffId)}
      />

      {/* Eingabeformular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lohnparameter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mitarbeiter-Auswahl */}
            <div className="space-y-1.5">
              <Label>Mitarbeiter</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.perso_nr ? `(${e.perso_nr})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Brutto / Stundenlohn */}
            <div className="space-y-1.5">
              <Label>Bruttogehalt / Monat (€)</Label>
              <Input type="number" value={grossMonthly} onChange={e => setGrossMonthly(e.target.value)} placeholder="z.B. 2500" />
            </div>
            <div className="text-xs text-muted-foreground text-center">— oder —</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stundenlohn (€)</Label>
                <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="z.B. 14" />
              </div>
              <div className="space-y-1.5">
                <Label>Monatsstunden</Label>
                <Input type="number" value={monthlyHours} onChange={e => setMonthlyHours(e.target.value)} placeholder="z.B. 160" />
              </div>
            </div>

            <Separator />

            {/* Steuer & Sozialversicherung */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Steuerklasse</Label>
                <Select value={taxClass} onValueChange={setTaxClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAX_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bundesland</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GERMAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Krankenversicherung</Label>
                <Select value={insuranceType} onValueChange={v => setInsuranceType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gesetzlich">Gesetzlich</SelectItem>
                    <SelectItem value="privat">Privat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kinderfreibeträge</Label>
                <Select value={String(childAllowances)} onValueChange={v => setChildAllowances(parseFloat(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHILD_ALLOWANCE_OPTIONS.map(v => (
                      <SelectItem key={v} value={String(v)}>{v.toFixed(1).replace(".", ",")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={churchTax} onCheckedChange={setChurchTax} />
              <Label>Kirchensteuer</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isSvExempt} onCheckedChange={setIsSvExempt} />
              <Label>Sozialabgabenbefreit</Label>
            </div>
          </CardContent>
        </Card>

        {/* SFN-Daten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schichtdaten (SFN)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Abrechnungsperiode</Label>
              <Select value={localPeriodId} onValueChange={setLocalPeriodId}>
                <SelectTrigger><SelectValue placeholder="Periode wählen..." /></SelectTrigger>
                <SelectContent>
                  {periods?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dateFrom && dateTo && (
                <p className="text-xs text-muted-foreground">
                  {new Date(dateFrom).toLocaleDateString("de-DE")} – {new Date(dateTo).toLocaleDateString("de-DE")}
                </p>
              )}
            </div>

            {hasSfnData ? (
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-primary" />
                  Aus {sfnData.shiftCount} Schichten im Zeitraum:
                </div>

                {/* Comparison table */}
                {sfnOther && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Kategorie</th>
                          <th className="text-right py-1.5 px-2 font-medium">
                            <span className={isExtended ? "text-muted-foreground" : "text-primary font-semibold"}>Einfach</span>
                          </th>
                          <th className="text-right py-1.5 pl-2 font-medium">
                            <span className={isExtended ? "text-primary font-semibold" : "text-muted-foreground"}>§3b</span>
                          </th>
                          <th className="text-right py-1.5 pl-2 font-medium text-muted-foreground">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const simple = isExtended ? sfnOther : sfnData;
                          const extended = isExtended ? sfnData : sfnOther;
                          const rows = [
                            { label: "Nacht 25 %", s: simple.night25Hours, e: extended.night25Hours },
                            { label: "Nacht 40 %", s: simple.night40Hours, e: extended.night40Hours },
                            { label: "So/Fei", s: simple.sundayHours, e: null as number | null },
                            { label: "Sonntag 50 %", s: null as number | null, e: extended.sundayHours },
                            { label: "Feiertag 125 %", s: null as number | null, e: extended.holidayHours },
                            { label: "Feiertag 150 %", s: null as number | null, e: extended.holiday150Hours },
                          ];
                          const fmtH = (n: number) => n.toFixed(2).replace(".", ",");
                          const hasDiff = rows.some(r => r.s !== null && r.e !== null && r.s !== r.e);
                          return rows
                            .filter(r => (r.s !== null && r.s > 0) || (r.e !== null && r.e > 0))
                            .map((r, i) => {
                              const diff = r.s !== null && r.e !== null ? r.e - r.s : null;
                              const diffColor = diff !== null && diff !== 0
                                ? diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                : "text-muted-foreground";
                              return (
                                <tr key={i} className="border-b border-border/50">
                                  <td className="py-1.5 pr-2 text-muted-foreground">{r.label}</td>
                                  <td className={`text-right py-1.5 px-2 tabular-nums ${!isExtended ? "font-semibold" : ""}`}>
                                    {r.s !== null ? `${fmtH(r.s)} h` : "—"}
                                  </td>
                                  <td className={`text-right py-1.5 pl-2 tabular-nums ${isExtended ? "font-semibold" : ""}`}>
                                    {r.e !== null ? `${fmtH(r.e)} h` : "—"}
                                  </td>
                                  <td className={`text-right py-1.5 pl-2 tabular-nums ${diffColor}`}>
                                    {diff !== null && diff !== 0 ? `${diff > 0 ? "+" : ""}${fmtH(diff)}` : "—"}
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {isExtended
                    ? "§3b EStG: Zuschläge additiv — Nacht + So/Fei stapeln sich"
                    : "Einfach: Nachtzuschläge werden bei So/Fei-Überlappung abgezogen"}
                </div>
              </div>
            ) : employeeId && dateFrom && dateTo ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Keine Arbeitszeiten im gewählten Zeitraum – Berechnung erfolgt ohne SFN-Zuschläge.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                Wähle einen Mitarbeiter und Zeitraum, um SFN-Daten zu laden.
              </p>
            )}

            <Button onClick={handleCalculate} disabled={calculating} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              {calculating ? "Berechne..." : "Brutto/Netto berechnen"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ergebnis */}
      {result && (
        <div className="space-y-6">
          {/* Source indicator */}
          <div className="flex items-center gap-2">
            {result.source === "api" ? (
              <Badge variant="outline" className="gap-1 text-xs border-green-500/50 text-green-700 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                Berechnung via Lohnica API
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="h-3 w-3" />
                Interne Schätzung (Fallback)
              </Badge>
            )}
            {calculationYear && calculationMonth && (
              <Badge variant="secondary" className="text-xs">
                {String(calculationMonth).padStart(2, "0")}/{calculationYear}
              </Badge>
            )}
          </div>

          {/* Zusammenfassungskarten */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Grundbrutto</p>
                <p className="text-2xl font-bold">{fmt(result.grossMonthly)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Netto-Auszahlung</p>
                <p className="text-2xl font-bold text-primary">{fmt(result.netMonthly + result.sfn.totalBonus)}</p>
                {result.sfn.totalBonus > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">inkl. {fmt(result.sfn.totalBonus)} SFN-Zuschläge</p>
                )}
                {sfnDelta !== 0 && (
                  <div className={`flex items-center justify-center gap-1 mt-1.5 text-xs ${sfnDelta > 0 ? "text-success" : "text-destructive"}`}>
                    {sfnDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="tabular-nums font-medium">{sfnDelta > 0 ? "+" : ""}{fmt(sfnDelta)}</span>
                    <span className="text-muted-foreground">im {otherModeName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">AG-Gesamtkosten</p>
                <p className="text-2xl font-bold">{fmt(result.employerTotal)}</p>
                {sfnDelta !== 0 && (
                  <div className={`flex items-center justify-center gap-1 mt-1.5 text-xs ${sfnDelta > 0 ? "text-success" : "text-destructive"}`}>
                    {sfnDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="tabular-nums font-medium">{sfnDelta > 0 ? "+" : ""}{fmt(sfnDelta)}</span>
                    <span className="text-muted-foreground">im {otherModeName}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailtabelle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Abzüge im Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Position</th>
                      <th className="text-right py-2 font-medium">Betrag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="py-2">Bruttogehalt</td><td className="text-right">{fmt(result.grossMonthly)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– Lohnsteuer</td><td className="text-right">{fmt(result.incomeTax)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– Solidaritätszuschlag</td><td className="text-right">{fmt(result.soli)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– Kirchensteuer</td><td className="text-right">{fmt(result.churchTax)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– AN-Krankenversicherung</td><td className="text-right">{fmt(result.employee.kv)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– AN-Rentenversicherung</td><td className="text-right">{fmt(result.employee.rv)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– AN-Arbeitslosenversicherung</td><td className="text-right">{fmt(result.employee.av)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">– AN-Pflegeversicherung</td><td className="text-right">{fmt(result.employee.pv)}</td></tr>
                    <tr className="font-semibold border-t-2 border-border"><td className="py-2">Nettogehalt</td><td className="text-right">{fmt(result.netMonthly)}</td></tr>

                    {result.sfn.totalBonus > 0 && (
                      <>
                        <tr className="border-t"><td className="py-2 pt-4 font-medium" colSpan={2}>Steuerfreie Zuschläge (SFN)</td></tr>
                        {result.sfn.night25Bonus > 0 && (
                          <tr className="text-muted-foreground"><td className="py-2 pl-4">+ Nachtzuschlag 25% (20–00, 04–06 Uhr)</td><td className="text-right">{fmt(result.sfn.night25Bonus)}</td></tr>
                        )}
                        {result.sfn.night40Bonus > 0 && (
                          <tr className="text-muted-foreground"><td className="py-2 pl-4">+ Nachtzuschlag 40% (00–04 Uhr)</td><td className="text-right">{fmt(result.sfn.night40Bonus)}</td></tr>
                        )}
                        {result.sfn.sundayBonus > 0 && (
                          <tr className="text-muted-foreground"><td className="py-2 pl-4">+ Sonntagszuschlag {SFN_RATES.sunday * 100}% (steuerfrei)</td><td className="text-right">{fmt(result.sfn.sundayBonus)}</td></tr>
                        )}
                        {result.sfn.holidayBonus > 0 && (
                          <tr className="text-muted-foreground"><td className="py-2 pl-4">+ Feiertagszuschlag {SFN_RATES.holiday * 100}% (steuerfrei)</td><td className="text-right">{fmt(result.sfn.holidayBonus)}</td></tr>
                        )}
                        {(result.sfn.holiday150Bonus ?? 0) > 0 && (
                          <tr className="text-muted-foreground"><td className="py-2 pl-4">+ Feiertagszuschlag {SFN_RATES.holiday150 * 100}% (steuerfrei)</td><td className="text-right">{fmt(result.sfn.holiday150Bonus!)}</td></tr>
                        )}
                        <tr className="font-semibold border-t-2 border-border">
                          <td className="py-2">Netto-Auszahlung</td>
                          <td className="text-right text-primary">{fmt(result.netMonthly + result.sfn.totalBonus)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="border-t-2"><td className="py-2 pt-4 font-medium" colSpan={2}>Arbeitgeberanteile</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">AG-Krankenversicherung</td><td className="text-right">{fmt(result.employer.kv)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">AG-Rentenversicherung</td><td className="text-right">{fmt(result.employer.rv)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">AG-Arbeitslosenversicherung</td><td className="text-right">{fmt(result.employer.av)}</td></tr>
                    <tr className="text-muted-foreground"><td className="py-2 pl-4">AG-Pflegeversicherung</td><td className="text-right">{fmt(result.employer.pv)}</td></tr>
                    
                    {/* AG-Umlagen from API */}
                    {result.agUmlagen && (
                      <>
                        <tr className="text-muted-foreground">
                          <td className="py-2 pl-4 flex items-center gap-1">
                            Umlage U1
                            <Tooltip>
                              <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[240px] text-xs">Gesetzliche Arbeitgeber-Umlage zur Erstattung von Lohnfortzahlungskosten im Krankheitsfall. Wird für alle Mitarbeiter abgeführt.</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="text-right">{fmt(result.agUmlagen.u1)}</td>
                        </tr>
                        <tr className="text-muted-foreground">
                          <td className="py-2 pl-4 flex items-center gap-1">
                            Umlage U2
                            <Tooltip>
                              <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[240px] text-xs">Gesetzliche Arbeitgeber-Umlage für Mutterschutz-Erstattungen. Wird für alle Mitarbeiter abgeführt – unabhängig vom Geschlecht.</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="text-right">{fmt(result.agUmlagen.u2)}</td>
                        </tr>
                        <tr className="text-muted-foreground"><td className="py-2 pl-4">Insolvenzumlage</td><td className="text-right">{fmt(result.agUmlagen.insolvenzumlage)}</td></tr>
                      </>
                    )}
                    
                    <tr className="font-semibold border-t border-border"><td className="py-2">AG-Gesamtkosten</td><td className="text-right">{fmt(result.employerTotal)}</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* SFN-Block */}
          {result.sfn.totalBonus > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gastro-Zuschläge (SFN)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid grid-cols-2 ${isExtended ? "sm:grid-cols-6" : "sm:grid-cols-5"} gap-4 text-sm`}>
                  <div>
                    <p className="text-muted-foreground">Nacht 25%</p>
                    <p className="font-semibold">{fmt(result.sfn.night25Bonus)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nacht 40%</p>
                    <p className="font-semibold">{fmt(result.sfn.night40Bonus)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sonntagszuschlag</p>
                    <p className="font-semibold">{fmt(result.sfn.sundayBonus)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Feiertag 125%</p>
                    <p className="font-semibold">{fmt(result.sfn.holidayBonus)}</p>
                  </div>
                  {isExtended && (
                    <div>
                      <p className="text-muted-foreground">Feiertag 150%</p>
                      <p className="font-semibold">{fmt(result.sfn.holiday150Bonus ?? 0)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Summe Zuschläge</p>
                    <p className="font-semibold text-primary">{fmt(result.sfn.totalBonus)}</p>
                  </div>
                </div>
                {result.effectiveNetHourlyRate > 0 && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-sm">
                      Effektiver Netto-Stundenlohn (inkl. Zuschläge): <strong>{fmt(result.effectiveNetHourlyRate)}/h</strong>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rechtlicher Hinweis */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Hinweis:</strong> {result.source === "api"
                ? "Berechnung basiert auf der Lohnica Brutto-Netto-API. Trotzdem unverbindlich – keine offizielle Lohnabrechnung."
                : "Diese Berechnung ist eine interne Schätzung und ersetzt keine offizielle Lohnabrechnung."}
              {" "}SFN-Zuschläge (Nacht, Sonntag, Feiertag) werden vereinfachend berechnet.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
